# Script de remoção do site antigo da Rykon no servidor UOL
# ATENÇÃO: Execute listar-projetos-uol.ps1 ANTES para identificar o que remover
# CUIDADO: Este script é DESTRUTIVO!

Write-Host "=========================================" -ForegroundColor Red
Write-Host "   ATENÇÃO - REMOÇÃO DE ARQUIVOS" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""

# Solicitar confirmação
$confirmacao = Read-Host "Digite o NOME EXATO do diretório/projeto a ser removido (Ex: rykon-site, site-antigo, etc)"

if ([string]::IsNullOrWhiteSpace($confirmacao)) {
    Write-Host "Operação cancelada - nenhum nome fornecido" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Você está prestes a REMOVER o projeto: $confirmacao" -ForegroundColor Red
$confirmar = Read-Host "Digite 'SIM REMOVER' para confirmar a exclusão"

if ($confirmar -ne "SIM REMOVER") {
    Write-Host "Operação cancelada pelo usuário" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Conectando ao servidor UOL..." -ForegroundColor Yellow

# Script de remoção no servidor
$scriptRemocao = @"
echo "========================================="
echo "INICIANDO REMOÇÃO DO PROJETO: $confirmacao"
echo "========================================="

# 1. Parar e remover processos PM2 relacionados
echo ""
echo "1. Removendo processos PM2..."
pm2 list | grep -i $confirmacao
pm2 delete $confirmacao 2>/dev/null || echo "Nenhum processo PM2 encontrado com esse nome"
pm2 delete ${confirmacao}-backend 2>/dev/null || echo "Nenhum backend PM2 encontrado"
pm2 delete ${confirmacao}-frontend 2>/dev/null || echo "Nenhum frontend PM2 encontrado"
pm2 save

# 2. Fazer backup antes de remover (por segurança)
echo ""
echo "2. Criando backup de segurança..."
if [ -d "/home/rykon/$confirmacao" ]; then
    tar -czf "/home/rykon/backup-${confirmacao}-$(date +%Y%m%d-%H%M%S).tar.gz" "/home/rykon/$confirmacao" 2>/dev/null
    echo "Backup criado em: /home/rykon/backup-${confirmacao}-*.tar.gz"
else
    echo "Diretório não encontrado: /home/rykon/$confirmacao"
fi

# 3. Remover diretório do projeto
echo ""
echo "3. Removendo diretório do projeto..."
if [ -d "/home/rykon/$confirmacao" ]; then
    rm -rf "/home/rykon/$confirmacao"
    echo "✓ Diretório removido: /home/rykon/$confirmacao"
else
    echo "× Diretório não existe: /home/rykon/$confirmacao"
fi

# 4. Listar o que sobrou
echo ""
echo "========================================="
echo "SITUAÇÃO ATUAL APÓS REMOÇÃO:"
echo "========================================="
echo ""
echo "Processos PM2:"
pm2 list

echo ""
echo "Diretórios em /home/rykon:"
ls -la /home/rykon/ | grep -v backup

echo ""
echo "Backups criados:"
ls -lh /home/rykon/backup-*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"

echo ""
echo "========================================="
echo "REMOÇÃO CONCLUÍDA!"
echo "========================================="
echo "IMPORTANTE: O backup foi salvo em /home/rykon/"
echo "Você pode restaurar executando:"
echo "tar -xzf /home/rykon/backup-${confirmacao}-*.tar.gz"
"@

ssh rykon@ssh.rykon.com.br $scriptRemocao

Write-Host ""
Write-Host "Operação concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "  1. Verifique se ficou apenas o projeto TeamCruz" -ForegroundColor White
Write-Host "  2. Teste se o site está funcionando: http://rykon.com.br" -ForegroundColor White
Write-Host "  3. Se tudo OK, pode remover os backups antigos" -ForegroundColor White
