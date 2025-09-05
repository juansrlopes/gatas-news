# Gatas News 📰

> O portal de notícias sobre as mulheres mais admiradas do mundo

**Gatas News** é um monorepo moderno que combina um portal de notícias focado em celebridades e mulheres famosas com uma API robusta para agregação de notícias. Construído com Nx, Next.js, Express.js, TypeScript e Tailwind CSS, oferece uma experiência de usuário moderna e acessível com arquitetura escalável.

## 🌟 Sobre o Projeto

O Gatas News é um **monorepo Nx** com **arquitetura database-first** que combina:

- **Frontend (Next.js)**: Portal de notícias com interface moderna e responsiva
- **API (Express.js)**: Servidor robusto com MongoDB, Redis e jobs automatizados
- **Database Layer**: MongoDB para persistência e Redis para cache de alta performance
- **Background Jobs**: Sistema automatizado de coleta de notícias com node-cron
- **Bibliotecas Compartilhadas**: Types e utilitários reutilizáveis entre projetos
- **Arquitetura Escalável**: Estrutura organizada para crescimento e manutenção

## ✨ Funcionalidades

### 🏠 **Página Principal**

- 📰 **Feed de Notícias**: Exibição de artigos sobre celebridades brasileiras
- 🔍 **Busca Avançada**: Filtro por nome de celebridade com suporte ao teclado (Enter)
- 📱 **Design Responsivo**: Layout adaptativo para mobile, tablet e desktop
- ⚡ **Carregamento Infinito**: Sistema de paginação com botão "Carregar Mais"

### 📸 **Instagram das Gatas**

- 🎯 **Perfis Embarcados**: Visualização direta dos perfis do Instagram
- 🔀 **Ordem Aleatória**: Perfis embaralhados a cada visita
- 🔍 **Busca de Perfis**: Filtro por nome de usuário do Instagram
- 📊 **Paginação**: Carregamento progressivo de perfis

### 🎨 **Experiência do Usuário**

- ♿ **Acessibilidade Completa**: ARIA labels, navegação por teclado, foco visual
- 🎭 **Estados de Loading**: Skeleton loaders elegantes durante carregamento
- 🚨 **Tratamento de Erros**: Mensagens de erro amigáveis e página 404 customizada
- 🌊 **Animações Suaves**: Transições e hover effects responsivos

## 🛠️ Tecnologias Utilizadas

### **Monorepo & Tooling**

- **[Nx](https://nx.dev/)** - Monorepo toolkit com cache inteligente e dependency graph
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática em todo o projeto

### **Frontend (apps/frontend)**

- **[Next.js 15](https://nextjs.org/)** - Framework React com SSR/SSG
- **[React 19](https://react.dev/)** - Biblioteca de interface de usuário
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Framework CSS utilitário
- **[Lucide React](https://lucide.dev/)** - Ícones modernos
- **[react-social-media-embed](https://www.npmjs.com/package/react-social-media-embed)** - Embeds do Instagram

### **Backend (apps/api)**

- **[Express.js](https://expressjs.com/)** - Framework web para Node.js
- **[MongoDB](https://www.mongodb.com/)** - Banco de dados NoSQL para persistência
- **[Mongoose](https://mongoosejs.com/)** - ODM para MongoDB com TypeScript
- **[Redis](https://redis.io/)** - Cache em memória de alta performance
- **[ioredis](https://github.com/luin/ioredis)** - Cliente Redis robusto para Node.js
- **[node-cron](https://github.com/node-cron/node-cron)** - Agendador de tarefas
- **[NewsAPI](https://newsapi.org/)** - API externa para coleta de notícias
- **[Winston](https://github.com/winstonjs/winston)** - Sistema de logging estruturado
- **[Express Validator](https://express-validator.github.io/)** - Validação de dados
- **[Express Rate Limit](https://github.com/nfriedly/express-rate-limit)** - Rate limiting
- **[Helmet](https://helmetjs.github.io/)** - Middleware de segurança

### **Bibliotecas Compartilhadas (libs/)**

- **shared-types**: Interfaces TypeScript compartilhadas
- **shared-utils**: Utilitários e funções reutilizáveis

### **Desenvolvimento**

- **[ESLint](https://eslint.org/)** + **[Prettier](https://prettier.io/)** - Linting e formatação
- **[Nodemon](https://nodemon.io/)** - Auto-restart para desenvolvimento
- **[ts-node](https://www.npmjs.com/package/ts-node)** - Execução direta de TypeScript

## 📁 Estrutura do Projeto

```
gatas-news/                    # Monorepo Nx
├── apps/                      # Aplicações
│   ├── frontend/              # Next.js Frontend
│   │   ├── src/
│   │   │   ├── components/    # Componentes React
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── NewsGrid.tsx
│   │   │   │   ├── SocialMedia.tsx
│   │   │   │   ├── BackToTopButton.tsx
│   │   │   │   ├── LoadingSkeleton.tsx
│   │   │   │   └── ErrorBoundary.tsx
│   │   │   ├── pages/         # Páginas Next.js
│   │   │   │   ├── index.tsx
│   │   │   │   ├── about.tsx
│   │   │   │   ├── social-media.tsx
│   │   │   │   ├── 404.tsx
│   │   │   │   ├── sitemap.xml.tsx
│   │   │   │   ├── _app.tsx
│   │   │   │   ├── _document.tsx
│   │   │   │   └── api/
│   │   │   │       └── image-proxy.ts
│   │   │   ├── styles/
│   │   │   │   └── globals.css
│   │   │   └── utils/
│   │   │       └── insta.json
│   │   ├── public/            # Arquivos estáticos
│   │   ├── next.config.ts
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── project.json       # Configuração Nx
│   └── api/                   # Express.js API
│       ├── index.ts           # Servidor principal
│       ├── celebrities.json   # Lista de celebridades
│       ├── tsconfig.json
│       └── project.json       # Configuração Nx
├── libs/                      # Bibliotecas compartilhadas
│   └── shared/
│       ├── types/             # Interfaces TypeScript
│       │   ├── src/index.ts
│       │   └── project.json
│       └── utils/             # Utilitários compartilhados
│           ├── src/index.ts
│           └── project.json
├── tools/                     # Ferramentas customizadas
├── .env.example               # Variáveis de ambiente
├── nx.json                    # Configuração Nx
├── tsconfig.base.json         # TypeScript base config
└── package.json               # Dependências do workspace
```

## 🚀 Como Executar

### **Pré-requisitos**

- Node.js 18+
- npm, yarn, pnpm ou bun

### **Instalação**

1. **Clone o repositório**

   ```bash
   git clone https://github.com/seu-usuario/gatas-news.git
   cd gatas-news
   ```

2. **Instale as dependências**

   ```bash
   npm install
   # ou
   yarn install
   # ou
   pnpm install
   ```

3. **Configure as variáveis de ambiente**

   ```bash
   cp .env.example .env.local
   ```

4. **Execute o projeto completo (Frontend + API)**

   ```bash
   npm run dev
   ```

   Ou execute individualmente:

   ```bash
   # Frontend (Next.js) - http://localhost:3000
   npm run dev:frontend

   # API (Express.js) - http://localhost:8000
   npm run dev:api
   ```

5. **Abra no navegador**
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **API**: [http://localhost:8000](http://localhost:8000)

## ⚙️ Configuração

### **Variáveis de Ambiente**

Crie um arquivo `.env.local` baseado no `.env.example`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_NEWS_API_ENDPOINT=/api/news

# Mock API (desenvolvimento)
NEXT_PUBLIC_USE_MOCK_API=true

# App Configuration
NEXT_PUBLIC_APP_NAME=Gatas News
NEXT_PUBLIC_APP_DESCRIPTION=O portal de notícias sobre as mulheres mais admiradas do mundo

# Quando a API real estiver pronta
NEWS_API_KEY=sua_chave_da_news_api
GUARDIAN_API_KEY=sua_chave_da_guardian_api
```

### **Scripts Disponíveis**

```bash
# Desenvolvimento
npm run dev              # Executar frontend + API em paralelo
npm run dev:frontend     # Apenas frontend (Next.js)
npm run dev:api          # Apenas API (Express.js)

# Build
npm run build            # Build de todos os projetos
npm run build:frontend   # Build apenas do frontend
npm run build:api        # Build apenas da API

# Produção
npm run start            # Executar frontend + API em produção
npm run start:frontend   # Apenas frontend em produção
npm run start:api        # Apenas API em produção

# Qualidade de código
npm run lint             # Lint de todos os projetos
npm run lint:frontend    # Lint apenas do frontend
npm run lint:api         # Lint apenas da API
npm run format           # Formatar código com Prettier

# Testes
npm run test             # Executar todos os testes
npm run test:frontend    # Testes do frontend
npm run test:api         # Testes da API

# Nx específicos
npm run graph            # Visualizar dependency graph
npm run reset            # Limpar cache do Nx
```

## 🔄 API Mock vs Real

### **Desenvolvimento (Mock API)**

Durante o desenvolvimento, o projeto usa uma API mock (`/api/news`) que:

- ✅ Fornece dados realistas de celebridades brasileiras
- ✅ Suporta busca e paginação
- ✅ Simula delay de rede para testes
- ✅ Permite desenvolvimento sem dependências externas

### **Produção (API Real)**

Para usar uma API real, configure:

```bash
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=https://sua-api-real.com
NEWS_API_KEY=sua_chave_real
```

## 🎯 Funcionalidades Detalhadas

### **Sistema de Busca**

- 🔍 Busca em tempo real por nome de celebridade
- ⌨️ Suporte ao Enter para executar busca
- 🧹 Botão limpar para resetar filtros
- 📱 Interface responsiva mobile-first

### **Carregamento e Performance**

- 💀 Skeleton loaders durante carregamento
- 🖼️ Otimização de imagens com Next.js Image
- ⚡ React.memo para prevenir re-renders
- 🔄 Lazy loading de componentes pesados

### **Acessibilidade (a11y)**

- ♿ Navegação completa por teclado
- 🔊 ARIA labels e roles apropriados
- 👁️ Indicadores de foco visíveis
- 📱 Suporte a leitores de tela

### **SEO e Meta Tags**

- 🌐 Meta tags dinâmicas por página
- 📊 Open Graph para redes sociais
- 🗺️ Sitemap XML automático
- 🤖 Robots.txt configurado

## 🚀 Deploy

### **Vercel (Recomendado)**

1. Conecte seu repositório no [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### **Outras Plataformas**

- **Netlify**: Suporte completo ao Next.js
- **Railway**: Deploy com banco de dados
- **DigitalOcean App Platform**: Infraestrutura escalável

## 🤝 Contribuição

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

## 📝 Roadmap

### **Próximas Funcionalidades**

- [ ] 🔐 Sistema de autenticação de usuários
- [ ] ❤️ Sistema de favoritos e likes
- [ ] 💬 Comentários em notícias
- [ ] 📧 Newsletter e notificações
- [ ] 🌙 Modo escuro/claro
- [ ] 🌍 Internacionalização (i18n)
- [ ] 📊 Dashboard administrativo
- [ ] 🔔 Notificações push (PWA)

### **Melhorias Técnicas**

- [ ] 🧪 Testes automatizados (Jest + Testing Library)
- [ ] 📈 Monitoramento de performance (Web Vitals)
- [ ] 🔍 Busca avançada com filtros
- [ ] 📱 Progressive Web App (PWA)
- [ ] 🗄️ Cache inteligente com SWR/React Query

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipe

- **Desenvolvedor Principal**: [Seu Nome](https://github.com/seu-usuario)
- **Design**: Baseado em tendências modernas de UI/UX
- **Conteúdo**: Foco em celebridades brasileiras

## 📞 Contato

- 📧 Email: seu-email@exemplo.com
- 🐦 Twitter: [@seu_twitter](https://twitter.com/seu_twitter)
- 💼 LinkedIn: [Seu Perfil](https://linkedin.com/in/seu-perfil)

---

<div align="center">

**Feito com ❤️ para celebrar as gatas mais incríveis do Brasil**

[⭐ Dê uma estrela](https://github.com/seu-usuario/gatas-news) • [🐛 Reportar Bug](https://github.com/seu-usuario/gatas-news/issues) • [💡 Sugerir Feature](https://github.com/seu-usuario/gatas-news/issues)

</div>
