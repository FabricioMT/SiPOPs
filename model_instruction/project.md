# Project Name: SiPOPs - Sistema de Instrução aos Procedimentos Operacionais Padrão


## 0. Instruções Gerais
Ativar o ambiente virtual: venv\Scripts\activate
Instalar dependências com proxy: pip install --proxy http://hcl:hcl@192.168.1.3:3128

## 1. Visão do Produto
Desenvolvimento de uma plataforma centralizada para gestão de conhecimento (POPs), padronização de processos e onboarding de novos funcionários em setores hospitalares (inicialmente Ala/Secretaria).
O sistema foca em alta confiabilidade, auditoria de leitura e suporte via Chat, com arquitetura preparada para futura integração com Inteligência Artificial (RAG).

**Objetivo Principal:** Eliminar ruído de comunicação, garantir que procedimentos sejam seguidos e agilizar o treinamento de novos colaboradores.

---

## 2. Stack Tecnológica

### Backend (API REST)
*   **Linguagem:** Python 3.12+
*   **Framework:** FastAPI (Async)
*   **ORM:** SQLAlchemy 2.0 (Async)
*   **Validação:** Pydantic v2
*   **Real-time:** WebSockets (Nativo FastAPI)
*   **Task Queue (Futuro):** Celery + Redis (para processamento de embeddings IA)

### Banco de Dados
*   **SGBD:** PostgreSQL 15+ (Em desenvolvimento com SQLite para agilidade)
*   **Extensões:**
    *   `pgvector` (Preparação para IA/Busca Semântica)
    *   `pg_trgm` (Busca textual eficiente)
*   **Migrations:** Alembic

### Frontend (SPA)
*   **Framework:** React 19+ com TypeScript
*   **Build Tool:** Vite
*   **State Management:** TanStack Query (React Query) + Zustand
*   **UI Library:** Mantine UI 8.x
*   **Editor de Texto:** Tiptap
*   **Notificações:** Mantine Notifications (Premium UI Feedback)

### Infraestrutura
*   **Containerização:** Docker & Docker Compose

---

## 3. Requisitos Funcionais

### Módulo 1: Gestão de Conhecimento (POPs) (Concluído)
*   **SiPOPs Omni-search:** Busca global debounced no Header para acesso instantâneo a qualquer POP.
*   **Temas:** Suporte nativo a Modo Claro/Escuro com persistência.
*   **Criação Centralizada (RBAC):** Apenas usuários com perfil `Gestor/Admin` podem criar, editar e arquivar POPs.
*   **Leitura e Aceite (Compliance):** Botão "Li e Estou Ciente" com auditoria por versão.

### Módulo 2: Onboarding & Trilhas (Concluído)
*   **Playlists de Treinamento:** Agrupamento de POPs por setor ou função.
*   **Barra de Progresso:** Feedback visual do onboarding por colaborador.
*   **Auditoria Admin:** Gestores podem visualizar o progresso detalhado de cada subordinado.

### Módulo 3: Tabela TUSS & Produtividade (Concluído)
*   **Consulta TUSS:** Base de dados com milhares de códigos de procedimentos.
*   **Copy-to-click:** Cópia instantânea para o clipboard.
*   **Códigos Recorrentes:** Identificação automática de códigos usados 3+ vezes por usuário.

### Módulo 4: Gestão de Usuários e Segurança (Concluído)
*   **Admin Dashboard:** Controle total de colaboradores (Edição, Alteração de Role, Status, Exclusão).
*   **Meu Perfil:** Autogestão de e-mail e troca de senha segura (verificação de senha atual).
*   **Roles Especializadas:** Novas roles setoriais (`SEC_UE_SUS`, `SEC_PA`, `SEC_PORTARIA`) para segmentação de acesso.

### Módulo 5: Setores & Protocolos (Concluído)
*   **Hub de Treinamento por Setor:** Páginas dedicadas (Urgência, P.A., Portaria) com guias técnicos do sistema SPDATA.
*   **Segmentação de Atendimento:** Guias específicos para Pacientes Internos vs. Externos em cada setor.
*   **Protocolos de Convênio:** Instruções de abertura de guias e recepção integradas ao detalhe de cada plano de saúde.

---

## 4. Arquitetura de Software

Adotaremos uma **Arquitetura Modular (Modular Monolith)**. O código será organizado por *Domínios de Negócio*.

### Estrutura de Diretórios Atualizada

```text
medicore-backend/
├── app/
│   ├── core/                   # Configs globais, Security, database
│   ├── modules/
│   │   ├── auth/               # Gestão de Usuários e Segurança
│   │   ├── knowledge_base/     # POPs e Versões
│   │   ├── tuss/               # Módulo de Códigos TUSS e Tracking
│   │   ├── onboarding/         # Playlists e Progresso de Usuários
│   │   └── chat/               # Comunicação em tempo real
│   └── main.py
├── frontend/                   # React + Mantine UI
└── docker-compose.yml
```

---

## 5. Roadmap e Conquistas

### ✅ Fase 1 a 4: Infraestrutura e POPs (Concluído)
*   Autenticação completa, Planos de Saúde e Gestão de POPs inicial.

### ✅ Fase 5: Preparação para Deploy (Concluído)
*   Dockerização completa e Healthchecks.

### ✅ Fase 6: Onboarding & Auditoria (Concluído)
*   Playlists de treinamento, barra de progresso e modal de auditoria para administradores.

### ✅ Fase 7: Rebranding SiPOPs & Omni-search (Concluído)
*   Transição total da marca para **SiPOPs**.
*   Implementação de busca global debounced e Tema Dark com persistência.

### ✅ Fase 8: Gestão Admin & TUSS (Concluído)
*   Painel administrativo para edição/exclusão de usuários.
*   Módulo TUSS com click-to-copy e aba de códigos recorrentes automatizada.

### ✅ Fase 9: Autogestão e Segurança (Concluído)
*   Dropdown de perfil no Header, troca de e-mail/senha segura e notificações premium.

### ✅ Fase 10: Hub de Setores & Instruções SPDATA (Concluído)
*   Implementação de roles por setor (`sec_ue_sus`, `sec_pa`, `sec_portaria`).
*   Páginas Hub para cada secretaria com guias passo-a-passo para o sistema SPDATA.
*   Modais de Protocolo de Atendimento integrados aos Planos de Saúde.
*   Reseed completo do banco de dados para suporte às novas funcionalidades.

### ✅ Fase 11: Gestão de Equipe & Criação (Concluído)
*   Endpoint de criação de usuários exclusivo para Administradores.
*   Geração automática de senha segura com funcionalidade "click-to-copy".
*   Interface para listagem e criação rápida de novos colaboradores.

### ✅ Fase 12: Reestruturação de Rotas & Navegação (Concluído)
*   Navegação aninhada contextual (Setor > Tipo > Convênios).
*   Breadcrumbs dinâmicos e botões "Voltar" que respeitam o histórico de navegação.
*   Simplificação da sidebar (Renomeado para "Guias").

### ✅ Fase 13: Segurança RBAC & Edição de Guias (Concluído)
*   Implementação de `RoleProtectedRoute` no frontend para isolamento de setores.
*   Filtragem automática de dados no backend baseada na role do usuário.
*   Ferramenta de edição direta dos textos dos guias (Botão de Lápis) para Admin/Gestor.

### ✅ Fase 14: Carga de Dados Massiva (TUSS XLS & Logos) (Concluído)
*   Importação de +13.000 códigos TUSS via `Codigos TUSS.xls`.
*   Mapeamento automático de 13 logomarcas de convênios na inicialização.
*   Reseed total do banco (`seed_v4.py`) para ambiente operacional completo.

---

## 6. Próximas Fases (Propostas)

### 🚀 Fase 15: Chat & Suporte com IA (A Iniciar)
1. **Mensageria:** Chat via WebSockets entre Colaboradores e Gestores.
2. **Integração IA:** RAG sobre a base de POPs para suporte automatizado.
