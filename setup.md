Here is the complete project documentation, code, and integration guide exported into a single Markdown format. You can copy the content below and save it as `README.md` or `INSTRUCTIONS.md` in your project root.

***

# Freelance English Teacher Platform
### Cross-Platform (Web + Mobile) React Native & Spring Boot Integration

This project transforms the playful "Superrbook" design into a high-end, professional academic aesthetic using **React Native (Expo)**, **NativeWind (Tailwind CSS)**, and **Spring Boot**.

---

## 🎨 1. Professional Color Palette
We have moved away from the "notebook" browns to a "Global Executive" palette to build trust and authority.

| Element | Color Hex | Tailwind Class | Description |
| :--- | :--- | :--- | :--- |
| **Primary** | `#1E293B` | `bg-slate-800` | Deep Navy: Trust and stability. |
| **Accent** | `#4F46E5` | `bg-indigo-600` | Indigo: Modern energy and action. |
| **Surface** | `#F8FAFC` | `bg-slate-50` | Off-white: Clean, readable background. |
| **Text** | `#0F172A` | `text-slate-900` | Near-black: High contrast for legibility. |

---

## 📂 2. Directory Structure (Monorepo)
Place both applications inside a single root folder for easier management.

```text
teacher-platform-root/
├── backend/                # Spring Boot Application
│   ├── src/main/java/...   # Controller, Service, Entity
│   ├── src/main/resources/
│   │   └── static/         # Destination for the Web Build
│   └── pom.xml
├── frontend/               # React Native (Expo) Application
│   ├── src/
│   │   ├── components/     # UI Parts (Hero.tsx, Features.tsx)
│   │   ├── screens/        # LandingScreen.tsx
│   │   └── theme/          # colors.js
│   ├── App.tsx
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## 💻 3. Frontend Implementation (`LandingScreen.tsx`)
This code uses **NativeWind**. It is responsive: it stacks vertically on mobile and expands for the web.

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

export default function EnglishTeacherLanding() {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <ScrollView className="flex-1 bg-white">
      {/* --- NAVIGATION (Web optimized) --- */}
      <StyledView className="px-6 py-4 flex-row justify-between items-center border-b border-slate-100 bg-white">
        <StyledText className="text-xl font-bold text-slate-800 italic">EnglishWithExpert</StyledText>
        {Platform.OS === 'web' && (
          <StyledView className="flex-row space-x-8">
            <StyledText className="text-slate-600">Method</StyledText>
            <StyledText className="text-slate-600">Pricing</StyledText>
          </StyledView>
        )}
      </StyledView>

      {/* --- HERO SECTION --- */}
      <StyledView className="px-6 py-20 items-center lg:flex-row lg:justify-between max-w-7xl mx-auto">
        <StyledView className="lg:w-1/2">
          <StyledText className="text-indigo-600 font-bold tracking-widest text-sm uppercase mb-3">
            Elite Language Coaching
          </StyledText>
          <StyledText className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-tight">
            Speak English{"\n"}With Authority.
          </StyledText>
          <StyledText className="text-xl text-slate-500 mt-6 leading-relaxed max-w-md">
            Personalized curriculum for corporate leaders and ambitious students. 
            Transform your communication in 90 days.
          </StyledText>
          
          <TouchableOpacity 
            onPress={() => setModalOpen(true)}
            className="mt-10 bg-indigo-600 py-4 px-10 rounded-xl shadow-indigo-200 shadow-lg self-start"
          >
            <Text className="text-white font-bold text-lg">Book Assessment</Text>
          </TouchableOpacity>
        </StyledView>

        {/* Dashboard Mockup (Showcase) */}
        <StyledView className="mt-16 lg:mt-0 lg:w-1/2 h-80 bg-slate-900 rounded-3xl p-6 shadow-2xl rotate-2">
             <StyledView className="w-full h-full border border-slate-700 rounded-xl p-4">
                <StyledText className="text-emerald-400 font-mono">Teacher Dashboard</StyledText>
                <StyledView className="mt-4 h-2 w-1/2 bg-slate-700 rounded" />
                <StyledView className="mt-8 flex-row justify-between">
                    <StyledView className="h-20 w-20 bg-indigo-500/20 rounded-lg" />
                    <StyledView className="h-20 w-20 bg-indigo-500/20 rounded-lg" />
                </StyledView>
             </StyledView>
        </StyledView>
      </StyledView>

      {/* --- FEATURES (Icon Grid) --- */}
      <StyledView className="bg-slate-50 py-24 px-6">
        <StyledView className="max-w-7xl mx-auto flex-row flex-wrap">
          {[
            { icon: "📝", title: "Business Writing", desc: "Master emails & reports" },
            { icon: "🎙️", title: "Accent Reduction", desc: "Speak clearly and naturally" },
            { icon: "📈", title: "Exam Prep", desc: "Targeted IELTS/TOEFL training" },
            { icon: "🤝", title: "Negotiation", desc: "Communication for sales" },
          ].map((item, i) => (
            <StyledView key={i} className="w-full md:w-1/2 lg:w-1/4 p-4">
              <StyledView className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-full">
                <StyledText className="text-3xl mb-4">{item.icon}</StyledText>
                <StyledText className="text-xl font-bold text-slate-900">{item.title}</StyledText>
                <StyledText className="text-slate-500 mt-2 leading-relaxed">{item.desc}</StyledText>
              </StyledView>
            </StyledView>
          ))}
        </StyledView>
      </StyledView>

      {/* --- CTA MODAL --- */}
      <Modal visible={isModalOpen} animationType="fade" transparent={true}>
        <StyledView className="flex-1 justify-center items-center bg-slate-900/80 px-4">
          <StyledView className="bg-white p-10 rounded-3xl w-full max-w-md">
            <StyledText className="text-3xl font-bold text-slate-900 mb-2">Reserved Seat</StyledText>
            <StyledText className="text-slate-500 mb-8">Claim your free 15-minute diagnostic call.</StyledText>
            
            <TextInput placeholder="Full Name" className="w-full border border-slate-200 p-4 rounded-xl mb-4 bg-slate-50" />
            <TextInput placeholder="Email Address" className="w-full border border-slate-200 p-4 rounded-xl mb-6 bg-slate-50" />
            
            <TouchableOpacity onPress={() => setModalOpen(false)} className="bg-indigo-600 py-4 rounded-xl items-center">
              <Text className="text-white font-bold text-lg">Send Application</Text>
            </TouchableOpacity>
          </StyledView>
        </StyledView>
      </Modal>
    </ScrollView>
  );
}
```

---

## 🛠️ 4. Setup Steps

### Frontend (React Native + Web)
1. **Initialize Expo:**
   ```bash
   npx create-expo-app frontend --template tabs
   cd frontend
   ```
2. **Install Styling Dependencies:**
   ```bash
   npm install nativewind tailwindcss@3.3.2 react-native-reanimated react-native-safe-area-context
   ```
3. **Initialize Tailwind:**
   ```bash
   npx tailwindcss init
   ```
   *Update `tailwind.config.js` with:* `content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"]`.

---

## ⚙️ 5. Spring Boot Integration Steps

To host the "Website" version of your app through your Spring Boot backend:

### Step 1: Export the Web Build
In the `frontend` folder, run:
```bash
npx expo export:web
```
This creates a `web-build` (or `dist`) folder containing `index.html`, `js`, and `css`.

### Step 2: Copy to Backend
Copy all files from `frontend/web-build/` to:
`backend/src/main/resources/static/`

### Step 3: Configure Spring Boot Routing
Create a configuration file to ensure that when a user refreshes the page, Spring Boot doesn't return a 404, but instead forwards the request to your React app.

```java
// backend/src/main/java/com/yourproject/config/WebConfig.java

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Redirect all non-API paths to the index.html for the Frontend to handle
        registry.addViewController("/{path:[^\\.]*}")
                .setViewName("forward:/index.html");
    }
}
```

### Step 4: Run the Application
1. Start Spring Boot (`./mvnw spring-boot:run`).
2. Visit `http://localhost:8080` to see your professional teacher website.
3. For mobile development, run `npx expo start` in the `frontend` folder.