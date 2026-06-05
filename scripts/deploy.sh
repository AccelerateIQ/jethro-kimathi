#!/bin/bash
set -e
# Deploy Jethro Kimathi static site to Azure Blob Storage
# Storage account: jethrokimathi | Container: $web (static website)

ACCOUNT=jethrokimathi
RG=AccelerateIQ
KEY=$(az storage account keys list -g $RG -n $ACCOUNT --query '[0].value' -o tsv)

az storage blob upload-batch \
  -s ./public \
  -d '$web' \
  --account-name $ACCOUNT \
  --account-key "$KEY" \
  --overwrite \
  --auth-mode key \
  --content-cache-control "no-cache, must-revalidate"

echo ""
echo "✓ Deployed to: https://${ACCOUNT}.z13.web.core.windows.net"
echo "   Admin:       https://${ACCOUNT}.z13.web.core.windows.net/admin/"
