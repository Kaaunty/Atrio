# ETAPA 10 — Central de Documentos do Colaborador

> **Fase:** Férias e Documentos (Fase 4)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 13, 29, 32 e 33)

---

## 1. Objetivo
Implementar a **Central de Documentos**, permitindo que o RH disponibilize arquivos individuais (holerites, informes de rendimento, contratos de trabalho, aditivos) e institucionais (políticas internas, manuais, acordos) com controle estrito de visibilidade, histórico de versões, download seguro e **confirmação de leitura / aceite de políticas**.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
DocumentType (Tipos e Categorias de Documento)
├── id: UUID (PK)
├── name: String (Ex: "Holerite / Contracheque", "Informe de Rendimentos", "Contrato de Trabalho", "Política Interna")
├── code: String (Unique, ex: "HOLERITE", "INFORME_RENDIMENTOS", "POLITICA_INTERNA", "CERTIFICADO")
├── is_institutional: Boolean (true = para todos/setor; false = individual por colaborador)
├── requires_read_acknowledgement: Boolean (Default: false)
└── created_at, updated_at

EmployeeDocument (Documentos Individuais / Publicações)
├── id: UUID (PK)
├── document_type_id: UUID (FK -> DocumentType.id)
├── employee_id: UUID (FK -> Employee.id, nullable se for documento institucional global)
├── title: String (Ex: "Holerite - Agosto/2026")
├── description: Text
├── file_url: String (Caminho seguro no storage - S3/Local criptografado)
├── file_name: String (Nome original do arquivo)
├── file_size: Integer (Em bytes)
├── mime_type: String
├── reference_month: Integer (Opcional, ex: 8)
├── reference_year: Integer (Opcional, ex: 2026)
├── expiration_date: Date (Data de validade, opcional)
├── visibility: Enum ('PRIVATE_EMPLOYEE_RH', 'DEPARTMENT', 'COMPANY_WIDE')
├── department_id: UUID (FK -> Department.id, se visibilidade for por departamento)
├── uploaded_by: UUID (FK -> User.id)
└── created_at, updated_at, deleted_at

DocumentReadReceipt (Confirmação de Leitura / Aceite)
├── id: UUID (PK)
├── document_id: UUID (FK -> EmployeeDocument.id, indexado)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── acknowledged_at: Timestamp (Data e hora do aceite)
├── ip_address: String
├── user_agent: String
└── PRIMARY KEY (id), UNIQUE (document_id, employee_id)
```

---

## 3. Diretrizes de Segurança e Armazenamento

1. **Armazenamento Privado (Não Público)**: Arquivos confidenciais nunca devem estar em diretórios com URL pública direta.
2. **Download via URL Assinada / Stream Autenticado**:
   - `GET /api/v1/documents/:id/download` valida o token do usuário logado e se ele tem direito de acessar aquele arquivo antes de realizar o stream do binário ou gerar uma *presigned URL* temporária (válida por 5 minutos).
3. **Upload em Lote de Holerites**:
   - Mecanismo para o RH importar um arquivo `.zip` ou múltiplos PDFs identificados pela matrícula/CPF no nome do arquivo (ex: `holerite_202608_123456.pdf`), distribuindo automaticamente para os colaboradores respectivos.

---

## 4. Endpoints de API

### Para o Colaborador
- `GET /api/v1/documents/me` — Lista documentos disponíveis para o colaborador (com filtros por categoria, ano e status de leitura)
- `GET /api/v1/documents/:id/download` — Download autenticado com auditoria de acesso
- `POST /api/v1/documents/:id/acknowledge` — Registra confirmação de leitura ou aceite de política

### Para o RH (Gestão)
- `POST /api/v1/documents/upload-single` — Upload de documento individual para um colaborador
- `POST /api/v1/documents/upload-batch` — Upload em lote com vinculação automática por matrícula/CPF
- `POST /api/v1/documents/publish-institutional` — Publica comunicado/política com exigência de leitura para todos ou setor específico
- `GET /api/v1/documents/:id/receipts-report` — Relatório de quem já leu/assinou a política e quem ainda está pendente

---

## 5. Frontend & Interfaces

1. **Central de Documentos (`/documentos/meus-documentos`)**:
   - Abas por categoria: *Holerites*, *Rendimentos / IRPF*, *Contratos & Termos*, *Políticas da Empresa*.
   - Badge visual de **"Novo / Não Lido"** em documentos que requerem aceite.
   - Modal de leitura com botão explícito de **"Confirmo que li e estou de acordo"**.
2. **Painel do RH (`/rh/documentos/gestao`)**:
   - Área de drag-and-drop para upload em lote de contracheques.
   - Tabela de acompanhamento de leituras com botão para exportar relatório de conformidade.

---

## 6. Critérios de Aceite

1. Colaborador só consegue fazer download de documentos vinculados a ele ou institucionais públicos da empresa.
2. O sistema registra data, hora e IP na confirmação de leitura de políticas institucionais.
3. Download de qualquer documento gera registro de acesso no log de auditoria.
4. O upload em lote associa corretamente os arquivos aos colaboradores pela matrícula sem erros de mapeamento.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/10-central-documentos.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
