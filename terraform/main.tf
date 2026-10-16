# AWS
#  ├── VPC (2 AZs)
#  │    ├── public subnets   -> load balancers, NAT gateway
#  │    ├── private subnets  -> worker nodes
#  │    └── NAT gateway      -> outbound internet for private subnets
#  └── EKS cluster
#       ├── managed add-ons (CoreDNS, kube-proxy, VPC CNI, EBS CSI, metrics-server)
#       └── managed node group (worker nodes)

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

# -----------------------------------------------------------------------------
# Network
# -----------------------------------------------------------------------------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr
  azs  = local.azs

  # /20 private subnets for nodes and Pods, /24 public subnets for load balancers.
  private_subnets = [for index, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, index)]
  public_subnets  = [for index, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, 48 + index)]

  enable_nat_gateway   = true
  single_nat_gateway   = true # one NAT keeps the classroom bill low; use one per AZ in production
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags that tell Kubernetes where it may create public / internal load balancers.
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

# -----------------------------------------------------------------------------
# EKS
# -----------------------------------------------------------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = var.cluster_name
  kubernetes_version = var.kubernetes_version

  # Public API endpoint so kubectl works from a laptop and from GitHub Actions.
  endpoint_public_access = true

  # Whoever runs `terraform apply` becomes cluster admin, otherwise kubectl is denied.
  enable_cluster_creator_admin_permissions = true

  access_entries = {
    for arn in var.cluster_admin_arns : arn => {
      principal_arn = arn
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni = {
      before_compute = true
    }
    eks-pod-identity-agent = {
      before_compute = true
    }
    # Needed for PersistentVolumeClaims (the PostgreSQL volume) on EBS.
    aws-ebs-csi-driver = {
      pod_identity_association = [{
        role_arn        = module.ebs_csi_pod_identity.iam_role_arn
        service_account = "ebs-csi-controller-sa"
      }]
    }
    # Needed by the HorizontalPodAutoscaler and `kubectl top`.
    metrics-server = {}
  }

  eks_managed_node_groups = {
    default = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = var.node_instance_types

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      labels = {
        workload = "taskboard"
      }
    }
  }
}

# IAM role for the EBS CSI driver, granted through EKS Pod Identity.
module "ebs_csi_pod_identity" {
  source  = "terraform-aws-modules/eks-pod-identity/aws"
  version = "~> 2.0"

  name = "${var.cluster_name}-ebs-csi"

  attach_aws_ebs_csi_policy = true
}
