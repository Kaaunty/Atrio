# Átrio — Identidade Visual e Design System

Este documento estabelece as diretrizes oficiais de **Identidade Visual, Paleta de Cores, Tipografia, Layout, Componentes e Tokens CSS** do projeto **Átrio — RH Digital**. Todos os desenvolvedores e agentes de IA devem seguir estritamente este guia para garantir consistência estética, usabilidade e sobriedade corporativa.

---

## 1. Princípio Visual e Conceito

### 🎯 Proporção Visual: 80% Neutro + 20% Identidade
A interface do Átrio deve seguir uma proporção rigorosa:
- **80% de base neutra**: Superfícies brancas (`#FFFFFF`), fundo cinza muito claro (`#F6F8FA`), bordas discretas (`#E2E8F0`) e tipografia escura de alta legibilidade (`#172033` / `#64748B`).
- **20% de identidade da marca e semântica**: O azul-marinho estrutural (`#082E5C` / `#061F3E`), toques intencionais de **Teal (`#0EAAA3`)** para elementos ativos e acentos, e cores semânticas reservadas exclusivamente para status e alertas.

### 🏢 Identidade do Símbolo Átrio
O símbolo do Átrio é formado pela letra estilizada **A** desenhando um portal/entrada, com uma pessoa posicionada no vão central:
- **Conceito**: *Pessoa no centro da organização*.
- **Navy (`#082E5C` / `#061F3E`)**: Confiança, estrutura, estabilidade, segurança e profissionalismo institucional.
- **Teal (`#0EAAA3` / `#087F7B`)**: Pessoas, evolução, conexão, modernidade e movimento humano.

---

## 2. Direção Visual da Aplicação

- **Layout Geral**:
  - **Sidebar fixa** em Navy Escuro (`#061F3E`).
  - **Logo do Átrio** posicionado no topo da sidebar.
  - **Área principal de conteúdo** sobre background cinza muito claro (`#F6F8FA`).
  - **Cards brancos** (`#FFFFFF`) com bordas discretas (`#E2E8F0`).
  - **Espaçamento generoso**: Bastante respiro entre seções e elementos.
  - **Hierarquia visual clara**: Títulos em Navy ou Texto Principal escuro.
- **O que EVITAR estritamente**:
  - ❌ Gradientes excessivos ou chamativos.
  - ❌ Sombras pesadas ou efeitos de vidro ("glassmorphism").
  - ❌ Interfaces excessivamente coloridas ou múltiplos botões coloridos na mesma tela.
  - ❌ Uso de preto puro (`#000000`) em textos ou fundos.

---

## 3. Paleta de Cores e Tokens Oficiais

```text
ÁTRIO DESIGN SYSTEM

Brand (Identidade)
├── Navy Principal     #082E5C  (Botões principais, títulos em destaque, identidade)
├── Navy Escuro        #061F3E  (Sidebar, cabeçalhos escuros, fundos de alto contraste)
├── Teal Principal     #0EAAA3  (Destaque ativo, indicadores de seleção, acentos da marca)
├── Teal Escuro        #087F7B  (Hover de elementos teal, textos sobre fundos claros)
└── Teal Claro         #DDF5F2  (Fundos de seleção, badges de marca, cards informativos)

Interface (Surfaces)
├── Background         #F6F8FA  (Fundo principal de todas as páginas)
├── Surface            #FFFFFF  (Cards, modais, tabelas, formulários, menus)
└── Border             #E2E8F0  (Bordas de cards, divisórias, inputs, separadores)

Typography (Texto)
├── Texto Principal    #172033  (Títulos, nomes, números de destaque, dados principais)
└── Texto Secundário   #64748B  (Descrições, labels, datas, placeholders, metadados)

Semantic (Cores de Status)
├── Success            #16A34A  (Ativo, Aprovado, Concluído, Sincronizado)
├── Warning            #D97706  (Pendente, Aguardando gestor, Aguardando RH, Atenção)
├── Danger             #DC2626  (Rejeitado, Vencido, Bloqueado, Divergência crítica)
├── Info               #2563EB  (Em análise, Em andamento, Informativos neutros)
└── Neutral            #64748B  (Cancelado, Inativo, Arquivado, Rascunho)
```

---

## 4. CSS Variables (`:root`)

```css
:root {
  /* Brand */
  --atrio-navy: #082E5C;
  --atrio-navy-dark: #061F3E;
  --atrio-teal: #0EAAA3;
  --atrio-teal-dark: #087F7B;
  --atrio-teal-light: #DDF5F2;

  /* Interface */
  --background: #F6F8FA;
  --surface: #FFFFFF;
  --border: #E2E8F0;

  /* Typography */
  --text-primary: #172033;
  --text-secondary: #64748B;

  /* Semantic */
  --success: #16A34A;
  --warning: #D97706;
  --danger: #DC2626;
  --info: #2563EB;
  --neutral: #64748B;
}
```

---

## 5. Diretrizes de Componentes

### 5.1 Sidebar de Navegação
- **Background**: Navy Escuro (`#061F3E`).
- **Logo**: Logotipo oficial com símbolo do Átrio no topo.
- **Texto do Item Inativo**: `#CBD5E1` (cinza azulado claro).
- **Texto do Item Ativo / Hover**: `#FFFFFF` (branco puro).
- **Indicador do Item Ativo**: Faixa lateral ou fundo sutil em **Teal Principal (`#0EAAA3`)** ou tom translúcido (`rgba(14, 170, 163, 0.15)`).
- *Regra*: Não transformar itens de menu em botões sólidos coloridos.

### 5.2 Botões
- **Botão Primário** (`bg-atrio-navy text-white hover:bg-atrio-navy-dark`):
  - Utilização: *Salvar*, *Confirmar*, *Continuar*, *Nova Solicitação*, *Solicitar Férias*.
- **Botão Secundário** (`bg-white border border-atrio-border text-atrio-navy hover:bg-slate-50`):
  - Utilização: *Voltar*, *Cancelar*, *Visualizar*, *Exportar*, ações secundárias.
- **Botão de Destaque da Marca** (`bg-atrio-teal text-white hover:bg-atrio-teal-dark`):
  - Utilização: Ações específicas ou de destaque da marca.
- **Botão Destrutivo** (`bg-semantic-danger text-white hover:bg-red-700` ou variante outline vermelha):
  - Utilização: *Excluir*, *Rejeitar*, *Remover*, *Cancelar definitivamente*.

### 5.3 Cards e Containers
- **Background**: Branco puro (`#FFFFFF`).
- **Borda**: `#E2E8F0` sutil (1px).
- **Sombra**: Mínima (`shadow-sm`) ou nenhuma.
- **Indicadores**: Em vez de pintar o card inteiro, usar um ícone colorido com fundo sutil (`bg-atrio-teal-light`, `bg-blue-50`, etc.) ou badge semântico no topo.

### 5.4 Tabela de Status e Badges Semânticos

| Status do Sistema | Variante Semântica | Classes Sugeridas (Tailwind) |
|---|---|---|
| **Ativo**, **Aprovado**, **Concluído**, **OK** | `Success` (`#16A34A`) | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| **Pendente**, **Aguardando gestor**, **Aguardando RH**, **Prazo próximo** | `Warning` (`#D97706`) | `bg-amber-50 text-amber-700 border-amber-200` |
| **Rejeitado**, **Vencido**, **Bloqueado**, **Divergência crítica** | `Danger` (`#DC2626`) | `bg-rose-50 text-rose-700 border-rose-200` |
| **Em análise**, **Em andamento**, **Informativo** | `Info` (`#2563EB`) | `bg-blue-50 text-blue-700 border-blue-200` |
| **Cancelado**, **Inativo**, **Arquivado**, **Rascunho** | `Neutral` (`#64748B`) | `bg-slate-100 text-slate-700 border-slate-200` |

---

## 6. Telas e Dashboards

Nos Dashboards, os indicadores devem utilizar a paleta com equilíbrio:
- **Colaboradores Ativos / Headcount**: Ícone ou acento em **Navy (`#082E5C`)** ou **Teal (`#0EAAA3`)**.
- **Férias Próximas**: Ícone em **Azul Info (`#2563EB`)**.
- **Solicitações Pendentes**: Ícone ou badge em **Warning (`#D97706`)**.
- **Divergências de Ponto**: Ícone em **Warning** (leves) ou **Danger** (críticas/faltas).
- **Processos Concluídos**: Ícone em **Success (`#16A34A`)**.
- **Gráficos**: Devem priorizar tons da marca (Navy `#082E5C`, Teal `#0EAAA3`, Teal Escuro `#087F7B`) antes de introduzir cores avulsas.

---

## 7. Modelos do Logotipo Oficial

O logotipo oficial do Átrio está disponível em 3 variantes de cor:

```text
public/
├── logo.png / logo-color.png   (Versão Principal: Navy #082E5C + Teal #0EAAA3)
├── logo-white.png              (Versão Monocromática Branca: #FFFFFF)
└── logo-black.png              (Versão Monocromática Preta: #000000)
```

### Diretrizes de Uso de Cada Modelo:

1. **Colorido (`/logo.png` ou `/logo-color.png`)**:
   - **Uso**: Modelo principal da marca. Deve ser utilizado em fundos claros (`#FFFFFF` ou `#F6F8FA`), topbars brancas, telas de login e materiais institucionais padrão.
2. **Branco (`/logo-white.png`)**:
   - **Uso**: Fundos escuros de alto contraste, como a **Sidebar Navy Escuro (`#061F3E`)**, rodapés escuros, banners e cartões com gradiente Navy.
3. **Preto (`/logo-black.png`)**:
   - **Uso**: Aplicações monocromáticas, documentos PDF para impressão física (ex: espelho de ponto impresso, termos de rescisão), relatórios preto e branco ou favicons simplificados.

