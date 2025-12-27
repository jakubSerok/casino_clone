# 🎰 Casino Clone

A modern, real-time online casino platform featuring popular games like Crash, Roulette, and Coin Flip. Built with Next.js, TypeScript, Socket.IO, and Prisma.

![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-13.5.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.0.0-2D3748)

## ✨ Features

- 🚀 **Real-time Gameplay**: Experience seamless multiplayer gaming with WebSocket support
- 🎮 **Multiple Games**: Play popular casino games including:
  - 🚀 **Crash Game**: Bet and cash out before the rocket crashes
  - 🎡 **Roulette**: Classic casino roulette with various betting options
  - 🪙 **Coin Flip**: Simple 50/50 chance game
- 🔒 **Secure Transactions**: Built-in wallet system with transaction history
- 👥 **User Profiles**: Track your stats, wins, and game history
- 🎨 **Modern UI**: Responsive design with smooth animations

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/casino-clone.git
   cd casino-clone
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Update the environment variables in `.env.local` with your configuration.

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **Frontend**: 
  - Next.js 13 (App Router)
  - TypeScript
  - Tailwind CSS
  - Framer Motion (animations)
  - Zustand (state management)

- **Backend**:
  - Next.js API Routes
  - Socket.IO (real-time communication)
  - Prisma (database ORM)
  - PostgreSQL (database)
  - JWT (authentication)

- **DevOps**:
  - ESLint + Prettier (code quality)
  - Husky (git hooks)
  - GitHub Actions (CI/CD)

## 📂 Project Structure

```
casino-clone/
├── app/                    # Next.js app directory
│   ├── api/                # API routes
│   ├── games/              # Game pages
│   ├── (auth)/             # Authentication pages
│   └── dashboard/          # User dashboard
├── components/             # Reusable components
│   ├── games/              # Game components
│   ├── ui/                 # UI components
│   └── layout/             # Layout components
├── lib/                    # Utility functions
├── prisma/                 # Database schema
├── public/                 # Static files
└── types/                  # TypeScript types
```

## 🔒 Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/casino"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- The open-source community for various libraries and tools
- All contributors who helped improve this project

---

Built with ❤️ by [Your Name]
