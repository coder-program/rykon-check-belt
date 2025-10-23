#!/bin/bash

# Script para adicionar ProtectedRoute às páginas críticas
# Lista de páginas que precisam de proteção

declare -a pages=(
  "frontend/app/professores/page.tsx"
  "frontend/app/usuarios/page.tsx"
  "frontend/app/unidades/page.tsx"
  "frontend/app/minha-franquia/page.tsx"
  "frontend/app/meus-alunos/page.tsx"
  "frontend/app/teamcruz/page.tsx"
)

for page in "${pages[@]}"; do
  echo "Protegendo página: $page"

  # Adicionar import se não existir
  if ! grep -q "ProtectedRoute" "$page"; then
    # Encontrar linha com useRouter e adicionar import depois
    sed -i '/import.*useRouter.*next\/navigation/a import ProtectedRoute from "@/components/auth/ProtectedRoute";' "$page"
  fi

  echo "✅ Import adicionado para $page"
done

echo "🔒 Imports de ProtectedRoute adicionados. Agora você precisa envolver manualmente os return() com <ProtectedRoute>...</ProtectedRoute>"