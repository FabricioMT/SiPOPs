# SiPOPs: Agent & Developer Master Guide
**Sistema de Instrução aos Procedimentos Operacionais Padrão**

---

## 1. Visão Geral e Contexto
O **SiPOPs** (ex-MediCore) é uma plataforma de gestão de conhecimento e treinamento hospitalar desenhada para o **Hospital Cesar Leite (HCL)**. Sua missão primária é eliminar erros operacionais em secretarias e recepções através de guias visuais passo-a-passo.

### O Problema que Resolvemos:
- **Timeout de portais de convênio**: Muitos portais (ex: IPSEMG) expiram em 15min. O SiPOPs fornece o roteiro imediato para evitar retrabalho.
- **Complexidade TUSS**: Dificuldade em encontrar códigos em guias físicas. O módulo TUSS oferece busca e cópia instantânea.
- **Onboarding Crítico**: Novos funcionários em setores como Urgência e Emergência (UE) ou Pronto Atendimento (P.A.) precisam de instruções rápidas para o software SPDATA.

---

## 2. Arquitetura do Sistema

### Backend: Modular Monolith (FastAPI)
- **Framework:** FastAPI (Async) com SQLAlchemy 2.0.
- **Lógica Setorial:** O backend filtra dados e guias com base nas roles do usuário.
- **Segurança:** Sistema Multi-role (Muitos-para-Muitos). Um usuário pode ter várias permissões simultâneas.
- **PGVector:** Preparado para buscas semânticas (IA/RAG) no futuro.

### Frontend: React 19 + Mantine UI
- **Biblioteca de UI:** Mantine UI 7/8 para componentes premium e responsivos.
- **Omni-search:** Busca global debounced integrada ao Header para consulta rápida de POPs.
- **Estado Global:** Zustand para gerenciamento de temas (Dark/Light) e sessões.
- **Navegação Dinâmica:** Breadcrumbs e lógica de "Voltar" baseada no contexto do setor.

---

## 3. Lógica de Dados & Relacionamentos (Dicas para Agentes)

### Hierarquia de Guias:
Para navegar ou criar conteúdos, o fluxo lógico é:
`Setor (UE_SUS, PA, etc) -> Tipo de Paciente (Interno/Externo) -> Convênio (Unimed, IPSM, IPSEMG)`.

### Modais de Convênio (AttendanceProtocol):
Estão vinculados a um **Convênio** específico.
- **JSON Structure:** Consistem em seções, caminhos de imagem e listas de instruções.
- **Links Diretos:** Os registros de `HealthPlan` podem conter URLs para os portais autorizadores.

### Guias SPDATA (SPDATAGuide):
Focam exclusivamente no uso do software de gestão hospitalar por setor. Diferenciam-se dos protocolos de convênio pelo nível de detalhe no fluxo do software interno.

---

## 4. Gestão de Assets e Media
**REGRA DE OURO:** Imagens de guias devem ser armazenadas de forma estruturada.
- **Caminho:** `frontend/public/img/guides/[setor_ou_convenio]/[processo]/step-[n].jpg`
- **Referência:** No banco, o caminho deve ser absoluto a partir da raiz pública (ex: `/img/guides/...`).
- **Dimensões:** Capturas de tela devem ser claras e enfatizar o campo de preenchimento.

---

## 5. Design System & Identidade Visual
O SiPOPs utiliza uma paleta de cores corporativa de saúde:
- **Cor Primária:** `#046c44` (SiPOPs Green) - Usada em botões de ação e headers.
- **Escala de Verdes:** `#a1c9b9`, `#64a48c`, `#549c7c`, `#449474`.
- **Acessibilidade:** Suporte total a Modo Escuro com auto-contraste.

---

## 6. Guia para "Perguntas Outliers" e Ideias de Desenvolvimento

### Q: "Como expandir o sistema para um novo setor?"
1. Adicione a nova Role em `app/modules/auth/models.py`.
2. Configure o componente de roteamento e navegação no frontend.
3. Adicione guias específicos no script de seed para popular os modais.

### Q: "Como o sistema escala para IA?"
O banco já possui suporte a vetores. O próximo passo é converter os POPs (Knowledge Base) em embeddings e alimentar um Chat de Suporte IA via WebSocket.

### Q: "O que fazer se um portal de convênio mudar o layout?"
Atualize as imagens no diretório correspondente e as instruções no `run_seed_v5.py`. Execute o seed para propagar a mudança.

---

## 7. Roadmap de Conquistas (Concluído vs. Futuro)
- [x] RBAC Multi-role com Matriz de Permissões.
- [x] Onboarding com Barra de Progresso.
- [x] Omni-search Global.
- [x] Autogestão de Perfil e Auditoria.
- [ ] Módulo de Chat Real-time (WebSockets).
- [ ] Inteligência Artificial para Suporte Operacional (RAG).
