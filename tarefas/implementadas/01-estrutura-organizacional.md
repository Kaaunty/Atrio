# ETAPA 01 — Estrutura Organizacional e Organograma

> **Fase:** Fundação (Fase 1)  
> **Status:** Concluído  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seção 5, 32 e 33)

---

## 1. Objetivo
Modelar e implementar o gerenciamento da estrutura da empresa: Empresas (matriz/filiais), Unidades/Locais, Setores (com hierarquia pai-filho e responsáveis), Cargos (com níveis e atribuições) e visualização interativa do Organograma.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
Company (Empresas)
├── id: UUID (PK)
├── legal_name: String (Razão Social)
├── trade_name: String (Nome Fantasia)
├── cnpj: String (Unique)
├── active: Boolean (Default: true)
└── created_at, updated_at, deleted_at

Unit (Unidades / Locais de Trabalho)
├── id: UUID (PK)
├── company_id: UUID (FK -> Company.id)
├── name: String
├── city: String
├── state: String
├── address: String
├── active: Boolean
└── created_at, updated_at, deleted_at

Department (Setores / Departamentos)
├── id: UUID (PK)
├── company_id: UUID (FK -> Company.id)
├── name: String
├── code: String (Opcional, ex: "FIN-01")
├── cost_center: String (Centro de Custo, opcional)
├── parent_id: UUID (FK -> Department.id, Auto-relacionamento para hierarquia)
├── manager_id: UUID (FK -> Employee.id, Responsável pelo setor)
├── active: Boolean (Default: true)
└── created_at, updated_at, deleted_at

Position (Cargos)
├── id: UUID (PK)
├── department_id: UUID (FK -> Department.id, opcional/relacionado)
├── title: String (Nome do cargo)
├── level: String (Ex: "Júnior", "Pleno", "Sênior", "Especialista", "Coordenador")
├── description: Text
├── responsibilities: Text
├── active: Boolean (Default: true)
└── created_at, updated_at, deleted_at
```

---

## 3. Endpoints de API

### Empresas & Unidades
- `GET /api/v1/companies` — Lista empresas ativas/inativas
- `POST /api/v1/companies` — Cadastra empresa (validação CNPJ)
- `PUT /api/v1/companies/:id` — Atualiza empresa
- `DELETE /api/v1/companies/:id` — Soft delete
- `GET /api/v1/companies/:id/units` — Lista unidades da empresa
- `POST /api/v1/units` — Cadastra unidade

### Setores (Departamentos)
- `GET /api/v1/departments` — Lista setores (filtros: empresa, ativo, busca textual)
- `GET /api/v1/departments/tree` — Retorna a árvore hierárquica completa dos setores
- `POST /api/v1/departments` — Cadastra setor (valida ciclo na hierarquia `parent_id`)
- `PUT /api/v1/departments/:id` — Atualiza setor
- `DELETE /api/v1/departments/:id` — Soft delete (bloquear se houver colaboradores ou subsetores vinculados)

### Cargos
- `GET /api/v1/positions` — Lista cargos com filtros por setor, nível e paginação
- `POST /api/v1/positions` — Cadastra cargo
- `PUT /api/v1/positions/:id` — Atualiza cargo
- `DELETE /api/v1/positions/:id` — Soft delete

### Organograma
- `GET /api/v1/organization/chart` — Retorna estrutura organizada por `Empresa → Setor → Gestores → Colaboradores`

---

## 4. Frontend & Interfaces

1. **Gestão de Setores (`/organizacao` - Aba Setores)**:
   - Tabela e visualização em árvore com identificação do responsável e subsetores.
   - Modal de cadastro e edição de setor.
2. **Gestão de Cargos (`/organizacao` - Aba Cargos)**:
   - Listagem com filtros por departamento e nível de senioridade.
3. **Página de Organograma (`/organizacao` - Aba Organograma)**:
   - Componente visual hierárquico navegável (árvore interativa com zoom/pan e nós expansíveis).

---

## 5. Checklist de Implementação

- [x] Criar migrations das tabelas `companies`, `units`, `departments` e `positions`.
- [x] Implementar Services e Repositories com validação de unicidade de CNPJ e proteção contra ciclos infinitos em `parent_id`.
- [x] Criar Controllers com DTOs tipados e validação de schema.
- [x] Implementar testes unitários para a montagem da árvore hierárquica.
- [x] Construir telas administrativas de Setores, Cargos e Empresas no frontend.
- [x] Construir a visualização interativa do Organograma.

---

## 6. Critérios de Aceite

1. É possível criar matriz, filiais, setores pai e filhos com profundidade arbitrária sem falhas.
2. A API impede referências circulares em setores (ex: Setor A ser pai de Setor B, e Setor B ser pai de Setor A).
3. A rota `/api/v1/organization/chart` retorna a hierarquia completa formatada em árvore.
4. Interface permite consultar e navegar no organograma visualmente.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/01-estrutura-organizacional.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
