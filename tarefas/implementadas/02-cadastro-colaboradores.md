# ETAPA 02 — Cadastro Centralizado de Colaboradores e Histórico (Timeline)

> **Fase:** Fundação (Fase 1)  
> **Status:** Concluído  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 4, 31, 32 e 33)

---

## 1. Objetivo
Implementar o cadastro centralizado de colaboradores (dados pessoais, profissionais, vínculos contratuais e gestores) e a rastreabilidade imutável de alterações por meio de uma Timeline de Histórico Profissional.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
Employee (Colaboradores)
├── id: UUID (PK)
├── code: String (Código interno / identificador)
├── registration_number: String (Matrícula)
├── name: String (Nome completo)
├── cpf: String (Unique, formatado e validado)
├── email: String (Unique, e-mail corporativo/pessoal)
├── phone: String (Telefone / WhatsApp)
├── birth_date: Date
├── address: JSONB ({ street, number, neighborhood, city, state, zip_code, complement })
├── emergency_contact: JSONB ({ name, relationship, phone })
├── avatar_url: String (Opcional)
│
│── Vínculos Organizacionais:
├── company_id: UUID (FK -> Company.id)
├── unit_id: UUID (FK -> Unit.id)
├── department_id: UUID (FK -> Department.id)
├── position_id: UUID (FK -> Position.id)
├── manager_id: UUID (FK -> Employee.id, Gestor direto imediato)
├── user_id: UUID (FK -> User.id, vínculo com usuário de autenticação)
│
│── Contrato & Jornada:
├── admission_date: Date
├── contract_type: Enum ('CLT', 'PJ', 'ESTAGIO', 'APRENDIZ', 'TEMPORARIO')
├── work_schedule_id: UUID (FK -> WorkSchedule.id)
├── status: Enum ('ATIVO', 'FERIAS', 'AFASTADO', 'DESLIGADO')
├── termination_date: Date (Opcional)
└── created_at, updated_at, deleted_at

EmployeeHistory (Histórico / Timeline)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id)
├── event_type: Enum ('ADMISSAO', 'MUDANCA_CARGO', 'MUDANCA_SETOR', 'MUDANCA_GESTOR', 'ALTERACAO_SALARIAL', 'FERIAS', 'AFASTAMENTO', 'DESLIGAMENTO', 'OUTRO')
├── description: Text (Resumo legível do evento)
├── event_date: Date (Data de vigência do evento)
├── previous_data: JSONB (Estado anterior das propriedades afetadas)
├── new_data: JSONB (Novo estado das propriedades afetadas)
├── registered_by: UUID (FK -> User.id, quem realizou o registro)
└── created_at: Timestamp (Imutável)
```

---

## 3. Endpoints de API

### Colaboradores
- `GET /api/v1/employees` — Lista colaboradores com paginação e filtros (departamento, cargo, status, empresa, busca por nome/CPF/matrícula)
- `GET /api/v1/employees/:id` — Detalhes completos do colaborador (incluindo vínculos de gestor e setor)
- `POST /api/v1/employees` — Cadastra novo colaborador (gera automaticamente evento `ADMISSAO` na timeline)
- `PUT /api/v1/employees/:id` — Atualiza dados cadastrais/profissionais (gera eventos correspondentes na timeline: `MUDANCA_CARGO`, `MUDANCA_SETOR`, `MUDANCA_GESTOR`, etc.)
- `POST /api/v1/employees/:id/avatar` — Upload de foto de perfil com compressão e armazenamento seguro
- `GET /api/v1/employees/:id/subordinates` — Lista colaboradores liderados diretamente por este gestor
- `GET /api/v1/employees/:id/timeline` — Lista eventos históricos ordenados cronologicamente (Timeline)

---

## 4. Regras de Negócio e Princípios

1. **Rastreabilidade Obrigatória**: Nenhuma alteração em Cargo, Setor, Gestor, Salário ou Status pode ocorrer sem a criação automática de um registro imutável em `EmployeeHistory`.
2. **Validação de CPF e Matrícula**: CPF deve ser único no sistema e matematicamente válido. Matrícula única por empresa.
3. **Prevenção de Loops de Gestão**: Um colaborador não pode ser gestor de si mesmo direta ou indiretamente na árvore de comando.

---

## 5. Frontend & Interfaces

1. **Lista de Colaboradores (`/colaboradores`)**:
   - Tabela rica com filtros rápidos (Setor, Cargo, Gestor, Status), busca global e badges visuais de status.
2. **Ficha do Colaborador (`/colaboradores/:id`)**:
   - Abas: *Dados Pessoais*, *Dados Profissionais & Contrato*, *Equipe & Gestão*, *Timeline Histórica*.
3. **Formulário de Admissão / Edição (`/colaboradores/novo` e `/colaboradores/:id/editar`)**:
   - Stepper ou formulário organizado por seções com validação em tempo real.
4. **Componente de Timeline (`<EmployeeTimeline />`)**:
   - Visualização cronológica vertical e elegante dos marcos da carreira na empresa.

---

## 6. Critérios de Aceite

1. Cadastro completo de colaborador com validações estritas de CPF, email e unicidade de matrícula.
2. Ao alterar o setor ou gestor de um colaborador, a timeline reflete a mudança com data, responsável e dados antigos/novos.
3. Não é permitida a exclusão física (`hard delete`) de registros históricos.
4. Interface permite navegar facilmente na equipe de um gestor e visualizar a timeline do colaborador.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/02-cadastro-colaboradores.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
