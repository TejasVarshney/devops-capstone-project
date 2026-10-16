terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # For team use, keep state in S3 instead of on one laptop. Create the bucket first,
  # then uncomment this block and run `terraform init -migrate-state`.
  #
  # backend "s3" {
  #   bucket       = "taskboard-terraform-state-<unique-suffix>"
  #   key          = "eks/terraform.tfstate"
  #   region       = "ap-south-1"
  #   use_lockfile = true
  #   encrypt      = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "taskboard"
      ManagedBy = "terraform"
    }
  }
}
