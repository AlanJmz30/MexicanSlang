# MexicanSlang — Responsive update

This update is based on the uploaded `MexicanSlang_web_ready(1).zip`.

## Visual changes
- Web navigation now displays the MexicanSlang brand instead of Expo Starter.
- Removed the Expo documentation link from the app navigation.
- Added top spacing for the web tab content on narrow screens so the fixed navigation does not cover the page.
- Capped the main learning content width on desktop.
- Capped the practice calendar and quiz cards to a readable desktop width.
- Centered and constrained the Explore screen on desktop.
- Preserved existing lesson, quiz, conversation, XP, streak, calendar, review, and AsyncStorage logic.

## Applying the update
Copy the contents of this project folder over your existing `MexicanSlang` project folder. Keep your existing `.git` directory and `node_modules` directory; they are not included in this ZIP.

Then run:
```bash
npm install
npx expo export --platform web
```

Review the generated web build locally before pushing changes to GitHub and deploying to Vercel.
