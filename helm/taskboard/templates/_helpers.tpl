{{/*
Chart name, truncated to the 63-character DNS label limit.
*/}}
{{- define "taskboard.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully qualified app name. With release "taskboard" this is simply "taskboard",
so the Services become taskboard-backend, taskboard-frontend and taskboard-postgres.
*/}}
{{- define "taskboard.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "taskboard.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Labels shared by every resource.
*/}}
{{- define "taskboard.labels" -}}
helm.sh/chart: {{ include "taskboard.chart" . }}
app.kubernetes.io/name: {{ include "taskboard.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: taskboard
{{- end }}

{{/*
Selector labels for one component. Usage:
  {{ include "taskboard.selectorLabels" (dict "ctx" . "component" "backend") }}
A Service finds its Pods through exactly these labels.
*/}}
{{- define "taskboard.selectorLabels" -}}
app.kubernetes.io/name: {{ include "taskboard.name" .ctx }}
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{- define "taskboard.componentLabels" -}}
{{ include "taskboard.labels" .ctx }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{- define "taskboard.backendName" -}}
{{- printf "%s-backend" (include "taskboard.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "taskboard.frontendName" -}}
{{- printf "%s-frontend" (include "taskboard.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "taskboard.postgresName" -}}
{{- printf "%s-postgres" (include "taskboard.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "taskboard.secretName" -}}
{{- default (printf "%s-db" (include "taskboard.fullname" .)) .Values.secrets.existingSecret }}
{{- end }}

{{/*
SQLAlchemy URL for the backend.
*/}}
{{- define "taskboard.databaseUrl" -}}
{{- if .Values.postgres.enabled }}
{{- $auth := .Values.postgres.auth }}
{{- printf "postgresql+psycopg://%s:%s@%s:5432/%s" $auth.username (urlquery $auth.password) (include "taskboard.postgresName" .) $auth.database }}
{{- else }}
{{- required "externalDatabase.url is required when postgres.enabled=false" .Values.externalDatabase.url }}
{{- end }}
{{- end }}
