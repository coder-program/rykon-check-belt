# 🎯 Localização do Botão "Aprovação de Graduações"

## ✅ Botões Adicionados nos Dashboards

### 1. **Master Dashboard**

**Arquivo:** `frontend/components/dashboard/MasterDashboard.tsx`

**Card do botão:**

```
┌──────────────────────────────────────────┐
│ 🏆 Aprovação de Graduações      [Novo!] │
│ Aprovar alunos para próxima faixa       │
│ Cor: Laranja                            │
└──────────────────────────────────────────┘
```

**Localização:** Logo após o card "Sistema Graduação"

---

### 2. **Gerente Dashboard**

**Arquivo:** `frontend/components/dashboard/GerenteDashboard.tsx`

**Card do botão:**

```
┌──────────────────────────────────────────┐
│ 🎓 Graduações                           │
│ 5 pendentes de aprovação                │
│ Cor: Amarelo (urgente se > 0)           │
└──────────────────────────────────────────┘
```

**Atualização:** Rota modificada de `/graduacoes` → `/admin/aprovacao-graduacao`

---

### 3. **Franqueado Dashboard**

**Arquivo:** `frontend/components/dashboard/FranqueadoDashboard.tsx`

**Card do botão:**

```
┌──────────────────────────────────────────┐
│ 🎓 Graduações                  [URGENTE]│
│ 8 graduações aguardando aprovação       │
│ Cor: Amarelo                            │
└──────────────────────────────────────────┘
```

**Atualização:** Rota modificada de `/graduacoes` → `/admin/aprovacao-graduacao`

---

## 🎨 Visualização nos Dashboards

### Master Dashboard:

```
Dashboard Master
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Usuários]  [Franqueados]  [Unid. Gestão]

[Sistema Graduação]  [🆕 Aprovação Graduações]  [Presença]

[Horários]  [Gerenc. Aulas]
```

### Gerente Dashboard:

```
Dashboard Gerente - TeamCruz Matriz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Total Alunos: 45    Presentes Hoje: 12

[Gerenciar Alunos]  [Registrar Presença]

[Horários]  [🎓 Graduações - 5 pendentes]  ← CLIQUE AQUI

[Relatórios]  [Minha Unidade]
```

### Franqueado Dashboard:

```
Dashboard Franqueado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Minhas Unidades: 3    Total Alunos: 120

[Minhas Unidades]  [Alunos]

[🎓 Graduações - 8 aguardando] ⚠️  ← CLIQUE AQUI

[Relatórios Financeiros]
```

---

## 🔗 Rota da Página

**URL:** `http://200.98.72.161/admin/aprovacao-graduacao`

**Arquivo:** `frontend/app/admin/aprovacao-graduacao/page.tsx`

---

## ✅ Como Acessar

1. **Login no sistema**
2. **Dashboard aparece automaticamente**
3. **Procurar pelo card:**
   - **Master**: Card laranja "Aprovação de Graduações" com badge "Novo!"
   - **Gerente**: Card amarelo "Graduações" (mostra quantidade pendente)
   - **Franqueado**: Card amarelo "Graduações" (mostra quantidade aguardando)
4. **Clicar no card**
5. **Será redirecionado para:** `/admin/aprovacao-graduacao`

---

## 📱 Mobile

Os cards ficam empilhados verticalmente em dispositivos móveis, mantendo a mesma ordem.

---

## 🎯 Perfis com Acesso

| Perfil          | Vê o Botão? | Pode Aprovar?           |
| --------------- | ----------- | ----------------------- |
| Master          | ✅ Sim      | ✅ Sim (todas unidades) |
| Admin           | ✅ Sim      | ✅ Sim (todas unidades) |
| Franqueado      | ✅ Sim      | ✅ Sim (suas unidades)  |
| Gerente Unidade | ✅ Sim      | ✅ Sim (sua unidade)    |
| Professor       | ❌ Não\*    | ✅ Sim (sua unidade)    |
| Recepcionista   | ❌ Não      | ❌ Não                  |
| Aluno           | ❌ Não      | ❌ Não                  |

\*Professor pode ter acesso se adicionarmos o botão no dashboard dele

---

**🎉 Tudo pronto! Os botões estão nos dashboards principais!**
