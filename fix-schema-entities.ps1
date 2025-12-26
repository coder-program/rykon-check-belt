# Script para remover schema hardcoded das entities
# O schema sera controlado pela configuracao do TypeORM

Write-Host "Removendo schema hardcoded das entities..." -ForegroundColor Yellow

# Encontrar todos os arquivos .entity.ts
$files = Get-ChildItem -Path "backend/src" -Recurse -Filter "*.entity.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    # Remover schema: 'teamcruz' de @Entity
    $content = $content -replace "@Entity\(\s*\{\s*name:\s*'([^']+)',\s*schema:\s*'teamcruz'\s*\}\s*\)", "@Entity({ name: '$1' })"
    $content = $content -replace "@Entity\(\s*\{\s*schema:\s*'teamcruz',\s*name:\s*'([^']+)'\s*\}\s*\)", "@Entity({ name: '$1' })"
    $content = $content -replace "@Entity\(\s*'([^']+)',\s*\{\s*schema:\s*'teamcruz'\s*\}\s*\)", "@Entity('$1')"

    # Remover schema de @JoinTable
    $content = $content -replace "schema:\s*'teamcruz',\s*", ""

    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  OK $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Concluido! Agora o schema sera controlado pelo DB_SCHEMA no .env" -ForegroundColor Green