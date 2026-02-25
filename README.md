<div align="center">

# 🐢 Shelly the Safety Turtle

### *A Safe, Engaging AI Companion for Children*

**Because every child deserves a friend who keeps them safe while they explore and learn!**

---

[![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/yourusername/tattle-turtle-web)
[![Powered by AI](https://img.shields.io/badge/Powered%20by-Google%20Gemini-4285F4.svg)](https://ai.google.dev/)
[![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E.svg)](https://supabase.com)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[Features](#-what-makes-shelly-special) • [Quick Start](#-quick-start-2-minutes) • [For Parents](#-for-parents) • [Tech Stack](#️-tech-stack) • [Contributing](#-contributing)

</div>

---

## 🌟 What is This?

**Shelly the Safety Turtle** is an AI-powered companion app designed to give children a safe, fun, and educational chat experience—while giving parents complete peace of mind!

Think of it as a friendly tutor, storyteller, and emotional support buddy, all rolled into one adorable turtle! 🐢

### 🎯 Who Is This For?

- **👶 Children (Ages 4-10)**: A friendly AI companion to chat with, ask questions, and learn from
- **👨‍👩‍👧 Parents**: Full monitoring, safety reports, and insights into your child's interests
- **🏫 Schools** *(Coming Soon)*: Classroom integration and student activity tracking

---

## ✨ What Makes Shelly Special?

### 🧒 For Kids

- 💬 **Chat with Shelly**: A friendly AI turtle who's always ready to talk, play, and help!
- 🎮 **Earn Rewards**: Collect badges, level up, and complete fun missions
- 🎨 **Customize Your Friend**: Choose from turtles, dolphins, crabs, and more—pick your favorite color!
- 🌈 **Always Safe**: Built-in AI guardrails keep conversations appropriate and positive
- ⭐ **Learn While Playing**: Educational conversations disguised as fun!

### 👪 For Parents

- 📊 **Smart Reports**: AI-generated summaries of your child's conversations and interests
- 🛡️ **Safety Monitoring**: Real-time content filtering and safety status updates
- 📚 **Book Recommendations**: Personalized reading suggestions based on your child's interests
- 🌱 **Growth Tracking**: See your child's emotional and intellectual development moments
- 🔔 **Stay Informed**: Know what your child is curious about and talking about

### 🔒 Safety First

- ✅ **AI Guardrails**: Every message is checked for safety before processing
- ✅ **Age-Appropriate**: Language and topics tailored for young children
- ✅ **No Inappropriate Content**: Automatic filtering and gentle redirection
- ✅ **Parent Oversight**: Full conversation history available to parents
- ✅ **Privacy Focused**: Your data stays yours—no selling, no sharing

---

## 🚀 Quick Start (2 Minutes!)

### What You'll Need

- ☕ A computer with Node.js installed ([Download here](https://nodejs.org/))
- 🔑 A free Google Gemini API key ([Get one here](https://ai.google.dev/))
- 🗄️ A free Supabase account ([Sign up here](https://supabase.com))

### Let's Go! 🎉

**1️⃣ Get the code**
```bash
git clone https://github.com/yourusername/tattle-turtle-web.git
cd tattle-turtle-web
npm install
```

**2️⃣ Set up your credentials**

We've made this super easy! Just fill in `.env.local`:

```bash
# Open .env.local and add your keys:
GEMINI_API_KEY="AIza..."        # From https://ai.google.dev/
SUPABASE_URL="https://..."       # From https://app.supabase.com/
SUPABASE_ANON_KEY="eyJ..."       # From https://app.supabase.com/
```

**3️⃣ Set up the database**

In your Supabase dashboard:
1. Click **SQL Editor**
2. Copy the contents of `supabase-schema.sql`
3. Paste and click **Run**

**4️⃣ Check everything is ready**
```bash
npm run check-env
```

**5️⃣ Launch! 🚀**
```bash
npm run dev
```

Open your browser to **http://localhost:3000** and meet Shelly! 🐢

> 💡 **Need help?** Check out [QUICKSTART.md](QUICKSTART.md) for a step-by-step guide with screenshots!

---

## 🎨 Features in Action

### Child Dashboard
- 🏠 **Home Base**: See your character, level, points, and latest badge
- 💬 **Brave Call**: Start chatting with your AI friend
- 🏆 **Missions**: Complete challenges to earn stars and rewards
- ⚙️ **Customize**: Change your character anytime!

### Chat Interface
- 🗨️ **Beautiful Messages**: Colorful, easy-to-read conversation bubbles
- 🎊 **Badge Celebrations**: Popup notifications when you earn new badges
- 📊 **Progress Tracking**: Watch your points and level grow
- ⚡ **Lightning Fast**: Instant responses powered by Google Gemini

### Parent Portal
- 📈 **Activity Dashboard**: Overview of your child's engagement
- 🔍 **Conversation Insights**: AI-generated summaries and patterns
- 📖 **Reading List**: Personalized book recommendations
- 💎 **Growth Moments**: Celebrate your child's development milestones
- ⚠️ **Safety Alerts**: Instant notifications if anything needs attention

---

## 🛠️ Tech Stack

We built this with love using modern, reliable technology:

| Technology | Purpose | Why We Love It |
|------------|---------|----------------|
| ⚛️ **React 19** | Frontend Framework | Fast, modern, and developer-friendly |
| ⚡ **Vite** | Build Tool | Lightning-fast development experience |
| 🎨 **TailwindCSS** | Styling | Beautiful, responsive designs in minutes |
| ✨ **Framer Motion** | Animations | Smooth, delightful user interactions |
| 🤖 **Google Gemini** | AI Brain | Powerful, safe, and smart conversations |
| 🗄️ **Supabase** | Database | Reliable PostgreSQL with real-time features |
| 🚂 **Express** | Backend | Simple, fast server for API routes |

---

## 📖 Documentation

- 📘 [**QUICKSTART.md**](QUICKSTART.md) - Get up and running in 2 minutes
- 📗 [**SETUP.md**](SETUP.md) - Detailed setup guide with troubleshooting
- 📙 [**supabase-schema.sql**](supabase-schema.sql) - Database schema reference

---

## 🗺️ Roadmap

We're just getting started! Here's what's coming:

### 🔜 Coming Soon
- [ ] 🔐 **User Authentication**: Secure login with Clerk or NextAuth
- [ ] 👨‍👩‍👧‍👦 **Multi-Family Support**: Multiple parents and children per account
- [ ] ☁️ **Vercel Deployment**: One-click deployment to production
- [ ] 📧 **Email Reports**: Weekly summaries sent to parents

### 🔮 Future Dreams
- [ ] 🎤 **Voice Chat**: Talk to Shelly out loud (perfect for younger kids!)
- [ ] 🏫 **School Integration**: Connect classroom hardware to parent accounts
- [ ] 📱 **Mobile App**: Native iOS and Android apps
- [ ] 🌍 **Multilingual**: Support for multiple languages
- [ ] 🎮 **Mini Games**: Educational games integrated into the chat
- [ ] 👥 **Group Mode**: Multiple children can chat together (supervised)

---

## 👥 For Parents

### Frequently Asked Questions

**Q: Is my child's data safe?**
A: Absolutely! All conversations are private, encrypted, and stored securely in your own Supabase database. We never sell or share data.

**Q: What if my child asks inappropriate questions?**
A: Our AI guardrails detect and block inappropriate content. Shelly will gently redirect the conversation to positive topics.

**Q: Can I see everything my child talks about?**
A: Yes! The parent portal gives you full access to conversation history and AI-generated insights.

**Q: What age is this appropriate for?**
A: Shelly is designed for children ages 4-10, but can be enjoyed by older kids too!

**Q: Do I need to pay for anything?**
A: Nope! Both Gemini API and Supabase offer generous free tiers. Perfect for families!

---

## 🤝 Contributing

We'd love your help making Shelly even better! Whether you're a developer, designer, educator, or parent with ideas—we want to hear from you!

### Ways to Contribute

- 🐛 **Report Bugs**: Found something broken? [Open an issue](https://github.com/yourusername/tattle-turtle-web/issues)
- 💡 **Suggest Features**: Have an idea? We'd love to hear it!
- 🔧 **Submit Code**: Pull requests are welcome!
- 📖 **Improve Docs**: Help others get started faster
- ⭐ **Star This Repo**: Show your support!

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/YOUR-USERNAME/tattle-turtle-web.git
cd tattle-turtle-web
npm install

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and test
npm run dev

# Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# Open a Pull Request!
```

---

## 📜 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

---

## 💖 Acknowledgments

- 🙏 **Google Gemini**: For powering our AI conversations
- 🙏 **Supabase**: For the amazing database platform
- 🙏 **All Contributors**: For making this project better
- 🙏 **Parents & Educators**: For trusting us with your children's safety

---

## 📞 Support & Community

- 💬 **Questions?** [Open a discussion](https://github.com/yourusername/tattle-turtle-web/discussions)
- 🐛 **Bug Reports:** [Create an issue](https://github.com/yourusername/tattle-turtle-web/issues)
- 📧 **Email:** hello@shellyturtle.com *(coming soon!)*
- 🐦 **Twitter:** [@ShellyTurtle](https://twitter.com/shellyturtle) *(coming soon!)*

---

<div align="center">

### Made with 💚 for children everywhere

**Because every conversation is a chance to learn, grow, and feel safe.**

⭐ **If you find this project helpful, please give it a star!** ⭐

[Get Started](#-quick-start-2-minutes) • [Report Bug](https://github.com/yourusername/tattle-turtle-web/issues) • [Request Feature](https://github.com/yourusername/tattle-turtle-web/issues)

</div>
