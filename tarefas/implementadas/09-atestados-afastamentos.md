# ETAPA 09 — Gestão de Atestados Médicos e Afastamentos

> **Fase:** Férias e Documentos (Fase 4)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 14, 29, 32 e 33)

---

## 1. Objetivo
Implementar o módulo seguro de envio e validação de **Atestados Médicos** e registro de **Afastamentos**, garantindo proteção estrita de dados médicos sensíveis (LGPD) com fluxo direto para o RH / Saúde Ocupacional e reflexo automático no espelho de ponto do colaborador.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
MedicalCertificate (Atestados Médicos)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── start_date: Date (Data de início do atestado)
├── days_count: Integer (Quantidade de dias de repouso)
├── end_date: Date (Data final calculada: start_date + days_count - 1)
├── issue_date: Date (Data de emissão pelo médico)
├── doctor_name: String (Nome do médico)
├── crm_number: String (Número de registro CRM / CRO)
├── cid_code: String (CID - Opcional e restrito ao RH / Médico)
├── reason_category: Enum ('CONSULTA', 'EXAME', 'DOENCA_ATE_15D', 'DOENCA_SUPERIOR_15D', 'ACIDENTE_TRABALHO', 'MATERNIDADE', 'ACOMPANHAMENTO_FAMILIAR', 'DOACAO_SANGUE', 'OUTROS')
├── notes: Text
├── document_url: String (Arquivo do atestado escaneado/foto)
├── status: Enum ('ENVIADO', 'EM_ANALISE_RH', 'APROVADO', 'REJEITADO', 'SOLICITADO_CORRECAO')
├── rh_reviewer_id: UUID (FK -> User.id)
├── rh_review_notes: Text
├── reviewed_at: Timestamp
└── created_at, updated_at

LeaveOfAbsence (Afastamentos Consolidados)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── medical_certificate_id: UUID (FK -> MedicalCertificate.id, nullable se não for médico)
├── leave_type: Enum ('ATESTADO_MEDICO', 'LICENCA_MATERNIDADE', 'LICENCA_PATERNIDADE', 'AUXILIO_DOENCA_INSS', 'ACIDENTE_TRABALHO_INSS', 'LICENCA_NAO_REMUNERADA', 'OUTRO')
├── start_date: Date
├── end_date: Date (nullable se tempo indeterminado)
├── return_date: Date (Data real de retorno ao trabalho)
├── inss_referral: Boolean (Encaminhado ao INSS - acima de 15 dias: true/false)
├── active: Boolean (Default: true)
└── created_at, updated_at
```

---

## 3. Segurança, LGPD e Privacidade de Dados Médicos

> [!IMPORTANT]
> **Proteção de Dados Médicos Sensíveis (LGPD Art. 11)**:
> 1. O gestor direto do colaborador **NÃO DEVE** ter acesso ao arquivo do atestado, ao CRM do médico ou ao CID da doença.
> 2. O gestor visualiza apenas o **impacto operacional**: *"Colaborador X ausente de tal data a tal data por motivo de saúde justificado"*.
> 3. Apenas usuários com a permissão específica `rh.atestados.visualizar_sensivel` podem visualizar o documento anexo e o CID.

---

## 4. Endpoints de API

### Para o Colaborador
- `POST /api/v1/medical-certificates` — Upload e envio de novo atestado médico
- `GET /api/v1/medical-certificates/me` — Histórico de atestados enviados e seus status

### Para o RH (Acesso Restrito e Auditado)
- `GET /api/v1/medical-certificates/rh` — Fila de atestados pendentes de validação
- `GET /api/v1/medical-certificates/rh/:id` — Detalhes completos (incluindo arquivo seguro e CID)
- `POST /api/v1/medical-certificates/rh/:id/approve` — Aprova atestado e cria automaticamente o `LeaveOfAbsence` com abono no ponto
- `POST /api/v1/medical-certificates/rh/:id/reject` — Rejeita atestado com motivo formal
- `POST /api/v1/medical-certificates/rh/:id/request-correction` — Solicita nova foto/arquivo mais legível

### Afastamentos
- `GET /api/v1/leaves-of-absence` — Lista de afastamentos vigentes na empresa (com filtros por setor e tipo)

---

## 5. Frontend & Interfaces

1. **Envio de Atestado (`/ponto/enviar-atestado`)**:
   - Upload de foto direto pela câmera do celular ou arquivo PDF/Imagem.
   - Campos: Data de Início, Quantidade de Dias, Categoria e Observações.
   - Feedback de confirmação e status de envio.
2. **Painel de Validação de Atestados do RH (`/rh/atestados`)**:
   - Visualizador embutido de documentos (com zoom e rotação de imagem).
   - Validador de dados do profissional e checagem automática se ultrapassa 15 dias de afastamento (alerta INSS).
3. **Visão de Equipe do Gestor (`/gestao/equipe/ausencias`)**:
   - Informa apenas o período de afastamento aprovado pelo RH, sem expor dados clínicos.

---

## 6. Critérios de Aceite

1. O colaborador consegue anexar foto/PDF do atestado com sucesso a partir de qualquer dispositivo.
2. O fluxo é restrito: gestores não conseguem visualizar a imagem do atestado nem o CID via API ou interface.
3. A aprovação do atestado pelo RH abona automaticamente os dias correspondentes no espelho de ponto (`TimeDailySummary`), alterando o status para `AFASTAMENTO` sem gerar horas de falta.
4. Afastamentos com mais de 15 dias no mesmo período exibem alerta de encaminhamento à perícia do INSS.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/09-atestados-afastamentos.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
