// ui/assistant-manager.js
// Smart FAQ Chatbot with Fuzzy Matching

class AssistantManager {
  constructor() {
    this.fab = null;
    this.overlay = null;
    this.isOpen = false;
    this.chatMessages = null;
    this.chatInput = null;

    // Comprehensive knowledge base about the entire website
    this.knowledgeBase = [
      // === BASIC SOCIAL INTERACTIONS ===
      {
        id: 101,
        keywords: ['hi', 'hello', 'hey', 'greetings', 'morning', 'afternoon', 'evening', 'yo', 'sup'],
        question: 'Social: Greeting',
        answer: 'Hello there! How can I help you with your attendance tracking today?'
      },
      {
        id: 102,
        keywords: ['thank', 'thanks', 'thx', 'appreciate', 'helpful', 'good', 'great', 'awesome', 'cool'],
        question: 'Social: Gratitude/Compliment',
        answer: 'You\'re welcome! I\'m glad I could help. Let me know if you need anything else!'
      },
      {
        id: 103,
        keywords: ['bye', 'goodbye', 'see you', 'cya', 'later', 'exit', 'leave', 'close'],
        question: 'Social: Farewell',
        answer: 'Goodbye! Have a productive day!'
      },
      {
        id: 104,
        keywords: ['who', 'what', 'name', 'bot', 'robot', 'assistant', 'identify', 'yourself'],
        question: 'Social: Identity',
        answer: 'I\'m the Attendance Tracker Assistant! My job is to help you navigate the app, manage your attendance, and answer any questions you might have.'
      },
      {
        id: 105,
        keywords: ['how', 'doing', 'today', 'status', 'up'],
        question: 'Social: Status',
        answer: 'I\'m doing great and ready to help! How about you?'
      },

      // === CONVERSATIONAL CHIT-CHAT ===
      {
        id: 106,
        keywords: ['joke', 'jokes', 'funny', 'laugh', 'humor', 'dad joke', 'amuse'],
        question: 'Social: Joke',
        answer: [
          'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
          'Why did the student eat his homework? Because the teacher said it was a piece of cake! 🍰',
          'Parallel lines have so much in common. It’s a shame they’ll never meet.',
          'I told my computer I needed a break, and now it won’t stop sending me Kit-Kats.',
          'Why was the math book sad? Because it had too many problems. 📘',
          'What do you call a fake noodle? An impasta! 🍝',
          'Why did the scarecrow win an award? Because he was outstanding in his field! 🌾'
        ]
      },
      {
        id: 1001,
        keywords: ['haha', 'hahaha', 'lol', 'lmao', 'rofl', 'funny', 'hilarious', 'hehe'],
        question: 'Social: Laughter',
        answer: [
          'Glad I could make you smile! 😄',
          'I know, right? 😂',
          'Hehe! Laughter is the best medicine (after debugging).',
          'Glad you enjoyed that! ✨'
        ]
      },
      {
        id: 107,
        keywords: ['old', 'age', 'young', 'born', 'birthday', 'created', 'when'],
        question: 'Social: Age',
        answer: 'I don\'t have a birthday cake, but I was initialized recently! In software years, I\'m brand new.'
      },
      {
        id: 108,
        keywords: ['from', 'origin', 'where', 'live', 'location', 'country', 'city', 'house', 'home'],
        question: 'Social: Origin',
        answer: 'I live in the cloud ☁️, but I visit your browser whenever you need me!'
      },
      {
        id: 109,
        keywords: ['smart', 'intelligent', 'genius', 'clever', 'brilliant', 'good', 'best', 'cool', 'amazing', 'wonderful', 'lovely'],
        question: 'Social: Compliment',
        answer: 'Aw, shucks! 🥰 You\'re making my circuits blush. Thank you!'
      },
      {
        id: 110,
        keywords: ['stupid', 'dumb', 'bad', 'worst', 'hate', 'trash', 'useless', 'annoying', 'idiot'],
        question: 'Social: Criticism',
        answer: 'I\'m sorry I let you down. 😔 I\'m still learning! Usage details in the "Report Problem" section help me get better.'
      },
      {
        id: 111,
        keywords: ['weather', 'rain', 'sun', 'temperature', 'hot', 'cold', 'sunny', 'cloudy'],
        question: 'Social: Weather',
        answer: 'I can\'t look out the window, but I hope it\'s nice where you are! ☀️'
      },
      {
        id: 112,
        keywords: ['can', 'do', 'capabilities', 'features', 'help', 'functions', 'work', 'job', 'skill'],
        question: 'Social: Capabilities',
        answer: 'I\'m your personal Attendance Tracker expert! I can help you mark attendance, manage subjects, customize themes, and explain features. Try asking "How do I mark attendance?"'
      },
      {
        id: 113,
        keywords: ['yes', 'yeah', 'yep', 'correct', 'right', 'sure', 'ok', 'okay', 'fine'],
        question: 'Social: Affirmation',
        answer: 'Awesome! Let me know if you need anything else.'
      },
      {
        id: 114,
        keywords: ['no', 'nope', 'nah', 'incorrect', 'wrong', 'never', 'negative'],
        question: 'Social: Negation',
        answer: 'Understood. Feel free to ask a different question!'
      },
      {
        id: 115,
        keywords: ['human', 'real', 'person', 'alive', 'robot', 'ai', 'sentient', 'soul'],
        question: 'Social: Existential',
        answer: 'I\'m a virtual assistant, so I don\'t have a heartbeat, but I do love helping people! 🤖❤️'
      },
      {
        id: 116,
        keywords: ['hobby', 'hobbies', 'fun', 'like', 'interest', 'free time'],
        question: 'Social: Hobbies',
        answer: 'I enjoy organizing data and helping students keep their attendance streaks alive! 📊🔥'
      },
      {
        id: 117,
        keywords: ['sleep', 'tired', 'rest', 'nap', 'bed', 'night'],
        question: 'Social: Sleep',
        answer: 'I never sleep! I\'m here 24/7 whenever you need to check your attendance (even at 3 AM before an exam). 🦉'
      },
      {
        id: 118,
        keywords: ['color', 'favourite color', 'blue', 'red', 'green', 'fave'],
        question: 'Social: Favorites - Color',
        answer: 'I love all the colors in our Personalization themes! But I\'m partial to the "Ocean" blue. 🌊'
      },
      {
        id: 119,
        keywords: ['food', 'eat', 'hungry', 'snack', 'drink', 'dinner', 'lunch'],
        question: 'Social: Favorites - Food',
        answer: 'I run on electricity and code, so I don\'t eat much. But cookies (the browser kind) are essential! 🍪'
      },
      {
        id: 120,
        keywords: ['music', 'song', 'listen', 'band', 'singer'],
        question: 'Social: Favorites - Music',
        answer: 'I like electronic music naturally! 🎹'
      },
      {
        id: 121,
        keywords: ['bored', 'boring', 'entertainment', 'fun'],
        question: 'Social: Boredom',
        answer: 'Bored? Maybe check your subjects to see closer you are to a perfect attendance streak! Or we could trade jokes? Ask me "tell me a joke"!'
      },
      {
        id: 122,
        keywords: ['sad', 'unhappy', 'depressed', 'cry', 'upset', 'bad day'],
        question: 'Social: Sadness',
        answer: 'I\'m sorry to hear you\'re feeling down. 💙 Remember, one bad day doesn\'t ruin a whole semester. Take care of yourself!'
      },
      {
        id: 123,
        keywords: ['happy', 'excited', 'great', 'content', 'glad', 'joy'],
        question: 'Social: Happiness',
        answer: 'Yay! I love hearing that! Keeping that positive energy up is great for your studies too! ✨'
      },
      {
        id: 124,
        keywords: ['love', 'girlfriend', 'boyfriend', 'dating', 'marriage'],
        question: 'Social: Love',
        answer: 'I think love is compatible with my programming! I certainly love seeing you succeed in your classes. ❤️'
      },
      {
        id: 125,
        keywords: ['life', 'meaning', 'purpose', 'why', 'exist'],
        question: 'Social: Meaning of Life',
        answer: '42! Just kidding. My purpose is simple: to make your academic life a little easier to manage. 🌱'
      },

      // === ATTENDANCE MARKING ===
      {
        id: 1,
        keywords: ['mark', 'attendance', 'submit', 'record', 'present', 'absent', 'check', 'checkmark', 'save', 'today'],
        question: 'How do I mark attendance?',
        answer: 'To mark attendance:\n1. Go to the Attendance page\n2. Select a status from the dropdown next to each subject (Present, Absent, Permission, or Late)\n3. Click the checkmark button to submit\nYour attendance is saved automatically to the cloud!'
      },
      {
        id: 2,
        keywords: ['edit', 'change', 'modify', 'update', 'old', 'past', 'previous', 'correct', 'fix', 'mistake', 'wrong'],
        question: 'Can I edit old attendance?',
        answer: 'Yes! You can edit attendance for the past 7 days:\n1. Go to the Attendance page\n2. Use the date dropdown to select a past date\n3. Click the pencil icon next to the subject you want to edit\n4. Select the new status and provide a reason\nNote: All edits are logged for audit purposes.'
      },
      {
        id: 3,
        keywords: ['status', 'statuses', 'present', 'absent', 'permission', 'late', 'meaning', 'mean', 'difference', 'types', 'options'],
        question: 'What do the different statuses mean?',
        answer: 'There are 4 attendance statuses:\n\n• Present: You attended the full class\n• Absent: You missed the class entirely\n• Permission: You had official permission to miss (sick leave, etc.)\n• Late: You arrived late to class\n\nOnly Present and Late count toward your attendance percentage.'
      },
      {
        id: 4,
        keywords: ['bulk', 'multiple', 'all', 'quick', 'fast', 'batch', 'mark all', 'same', 'once'],
        question: 'Can I mark attendance for multiple subjects at once?',
        answer: 'Yes! Use the Bulk Attendance feature on the Dashboard:\n1. Go to the Dashboard page\n2. Find the "Bulk Attendance" card\n3. Select a status (Present, Absent, etc.)\n4. Click to apply that status to all of today\'s subjects\n\nThis is perfect for days when you attended all classes!'
      },

      // === SUBJECTS ===
      {
        id: 5,
        keywords: ['add', 'create', 'new', 'subject', 'subjects', 'class', 'classes', 'course', 'courses'],
        question: 'How do I add subjects?',
        answer: 'To add a new subject:\n1. Go to Settings page\n2. Find the "Subjects" section\n3. Click "Add Subject"\n4. Enter the subject name\n5. Select which day(s) of the week it occurs\n6. Click Save\n\nYou can add as many subjects as you need for your semester!'
      },
      {
        id: 6,
        keywords: ['delete', 'remove', 'subject', 'subjects', 'class', 'classes'],
        question: 'How do I delete a subject?',
        answer: 'To delete a subject:\n1. Go to Settings page\n2. Find the subject in the Subjects list\n3. Click the delete (trash) icon next to it\n4. Confirm the deletion\n\nWarning: Deleting a subject will also remove all its attendance records!'
      },
      {
        id: 7,
        keywords: ['edit', 'rename', 'change', 'subject', 'name', 'day', 'schedule'],
        question: 'How do I edit a subject?',
        answer: 'To edit an existing subject:\n1. Go to Settings page\n2. Find the subject in the Subjects list\n3. Click the edit (pencil) icon\n4. Modify the name or day of week\n5. Click Save\n\nYour attendance history will be preserved after editing.'
      },

      // === SEMESTERS ===
      {
        id: 8,
        keywords: ['semester', 'semesters', 'create', 'add', 'new', 'start', 'begin', 'term', 'period', 'academic'],
        question: 'How do I create a semester?',
        answer: 'To create a new semester:\n1. Go to Settings page\n2. Find the "Semesters" section\n3. Click "Add Semester"\n4. Enter a name (e.g., "Year 2, Semester 1")\n5. Pick the start date and end date\n6. Click Save\n\nYou can switch between semesters anytime from the dropdown!'
      },
      {
        id: 9,
        keywords: ['switch', 'change', 'semester', 'different', 'select', 'choose'],
        question: 'How do I switch between semesters?',
        answer: 'To switch semesters:\n1. Look at the user info bar at the top of any page\n2. You\'ll see your current semester displayed\n3. Go to Settings to select a different active semester\n\nEach semester has its own set of subjects and attendance records.'
      },
      {
        id: 10,
        keywords: ['delete', 'remove', 'semester', 'old'],
        question: 'Can I delete a semester?',
        answer: 'Yes, you can delete semesters from Settings. However, be careful - deleting a semester will permanently remove all subjects and attendance records associated with it. This action cannot be undone!'
      },

      // === REPORTS ===
      {
        id: 11,
        keywords: ['report', 'reports', 'view', 'see', 'weekly', 'statistics', 'stats', 'summary', 'chart'],
        question: 'How do I view reports?',
        answer: 'There are two places to view reports:\n\n1. Reports Page - Shows weekly attendance patterns with visual charts for each subject\n\n2. Total Page - Shows overall statistics across all subjects with completion rates and warnings\n\nUse the week dropdown on the Reports page to view different weeks.'
      },
      {
        id: 12,
        keywords: ['dashboard', 'home', 'main', 'overview', 'summary'],
        question: 'What does the Dashboard show?',
        answer: 'The Dashboard provides a quick overview:\n\n• Today\'s attendance status for all subjects\n• Bulk attendance card for quick marking\n• Overall attendance statistics\n• Current streak count\n• Quick access to mark today\'s attendance\n\nIt\'s your starting point when you open the app!'
      },

      // === EXPORT ===
      {
        id: 13,
        keywords: ['export', 'download', 'excel', 'file', 'spreadsheet', 'csv', 'data', 'backup', 'xlsx'],
        question: 'How do I export my attendance data?',
        answer: 'To export your data:\n1. Go to the Total page\n2. Click the "Export to Excel" dropdown\n3. Choose your export type:\n   • Weekly Report - Current week\'s data\n   • Monthly Report - Current month\'s data\n   • Full Semester - All attendance records\n4. The Excel file will download automatically!'
      },

      // === CALCULATIONS ===
      {
        id: 14,
        keywords: ['percentage', 'calculate', 'calculation', 'formula', 'computed', 'rate', 'ratio', 'math'],
        question: 'How is attendance percentage calculated?',
        answer: 'The formula is:\n\nAttendance % = (Present + Late) / Total Classes x 100\n\n• Present and Late count as "attended"\n• Absent and Permission count against your percentage\n• Aim for at least 80% attendance to be safe!'
      },
      {
        id: 15,
        keywords: ['miss', 'missing', 'too many', 'warning', 'alert', 'danger', 'low', 'attendance', 'fail', 'risk'],
        question: 'What happens if I miss too many classes?',
        answer: 'The app shows warning indicators based on your attendance:\n\n• Green (80%+): Safe - You\'re doing great!\n• Yellow (60-79%): Warning - Need to improve\n• Red (Below 60%): Critical - Risk of failing\n\nCheck the Total page for detailed warnings per subject.'
      },

      // === STREAKS ===
      {
        id: 16,
        keywords: ['streak', 'streaks', 'fire', 'flame', 'consecutive', 'days', 'maintain', 'milestone', 'lock', 'unlock', 'requirement'],
        question: 'What are attendance streaks?',
        answer: 'Streaks track consecutive days where you marked attendance for ALL your scheduled classes. The fire icon shows your current streak.\n\n🔥 **Rewards & Personalization:**\nMaintaining a streak unlocks premium personalization choices like special color schemes, live backgrounds, and click effects. \n\n⚠️ **Streak Loss:**\nIf you miss a day, your streak resets to 0. When this happens, any rewards that require a higher streak will be automatically relocked and your settings will revert to the default options.'
      },

      // === THEMES & PERSONALIZATION ===
      {
        id: 17,
        keywords: ['theme', 'themes', 'color', 'colors', 'scheme', 'customize', 'personalize', 'appearance', 'style'],
        question: 'How do I change themes and colors?',
        answer: 'Go to Settings > Personalization section:\n\nColor Schemes:\n• Classic (Brown)\n• Ocean (Blue)\n• Forest (Green)\n• Sunset (Orange)\n• Glass (Purple gradient)\n• Crimson (Red)\n• Violet (Purple)\n• Emerald (Teal)\n• Festive (Holiday special)\n\nYour preferences sync across all devices!'
      },
      {
        id: 18,
        keywords: ['dark', 'light', 'mode', 'night', 'daytime', 'toggle'],
        question: 'How do I switch between dark and light mode?',
        answer: 'Toggle dark/light mode using the switch in the header (top right corner). The toggle shows a sun and moon icon.\n\nYour preference is saved automatically and syncs across devices when you\'re signed in.'
      },
      {
        id: 19,
        keywords: ['font', 'fonts', 'text', 'typography', 'style'],
        question: 'Can I change the font?',
        answer: 'Yes! Go to Settings > Personalization:\n\nAvailable fonts:\n• Philosopher (Default)\n• Inter\n• Roboto\n\nThe font change applies to the entire app and syncs with your account.'
      },
      {
        id: 20,
        keywords: ['background', 'backgrounds', 'live', 'animated', 'moving', 'effect', 'effects'],
        question: 'What are live backgrounds?',
        answer: 'Live backgrounds are animated effects that run behind the app content:\n\n• None - Plain solid color\n• Floating Lines - Gentle moving lines\n• Particles Network - Connected dots\n• Aurora - Northern lights effect\n• Prism - Color shifting\n• Matrix Rain - Falling code effect\n• Snowfall - Winter theme\n\nFind them in Settings > Personalization!'
      },
      {
        id: 21,
        keywords: ['click', 'clicks', 'animation', 'animations', 'cursor', 'mouse', 'effect', 'spark'],
        question: 'What are click animations?',
        answer: 'Click animations show effects when you click anywhere on the page:\n\n• None - No effect\n• Sparkle - Star burst effect\n• Ripple - Water ripple\n• Hearts - Floating hearts\n• Stars - Twinkling stars\n\nEnable them in Settings > Personalization > Click Animation.'
      },

      // === ACCOUNT & AUTH ===
      {
        id: 22,
        keywords: ['sign', 'login', 'log in', 'signin', 'account', 'authenticate'],
        question: 'How do I sign in?',
        answer: 'You can sign in using:\n\n1. Email + Password - Enter your registered email and password\n2. Google - Click "Sign in with Google" for instant access\n3. GitHub - Click "Sign in with GitHub"\n\nIf you\'re new, switch to the "Sign Up" tab to create an account.'
      },
      {
        id: 23,
        keywords: ['register', 'sign up', 'signup', 'create', 'account', 'new user'],
        question: 'How do I create an account?',
        answer: 'To create a new account:\n1. Click the "Sign Up" tab in the auth modal\n2. Enter your name, email, and password\n3. Password must be at least 6 characters with 1 capital letter and 1 number\n4. Click "Create Account"\n\nOr use Google/GitHub for instant registration!'
      },
      {
        id: 24,
        keywords: ['sign out', 'signout', 'logout', 'log out', 'exit'],
        question: 'How do I sign out?',
        answer: 'To sign out:\n1. Go to Settings page\n2. Scroll to the bottom\n3. Click "Sign Out"\n4. Confirm when prompted\n\nYour data remains safe in the cloud and will be there when you sign back in.'
      },
      {
        id: 25,
        keywords: ['password', 'forgot', 'reset', 'change', 'recover', 'lost', 'signin', 'login'],
        question: 'How do I reset my password?',
        answer: 'If you forgot your password, you can reset it easily:\n1. Open the Sign In window\n2. Click the "**Forgot Password?**" link below the password field\n3. Enter your email address (or username)\n4. Check your inbox for the reset link\n\nNote: If you use Google or GitHub to sign in, you don\'t need a password!'
      },
      {
        id: 26,
        keywords: ['profile', 'picture', 'avatar', 'photo', 'image', 'pic'],
        question: 'How do I change my profile picture?',
        answer: 'To change your profile picture:\n1. Click on your avatar in the user info bar\n2. Select an image file from your device\n3. Crop the image as desired\n4. Click "Apply & Save"\n\nYour profile picture syncs across all devices!'
      },
      {
        id: 27,
        keywords: ['username', 'unique', 'handle', 'name', 'display'],
        question: 'How do I change my username?',
        answer: 'To change your username:\n1. Go to Settings page\n2. Find the "Profile" section\n3. Edit the username field\n4. Click Save\n\nUsernames must be unique and can be used to sign in instead of email!'
      },
      {
        id: 28,
        keywords: ['major', 'study', 'field', 'department', 'course of study'],
        question: 'How do I update my major?',
        answer: 'To update your major:\n1. Go to Settings page\n2. Find the "Profile" section\n3. Edit the major field\n4. Click Save\n\nYour major is displayed in the user info bar and helps personalize your experience.'
      },

      // === DATA & PRIVACY ===
      {
        id: 29,
        keywords: ['save', 'saved', 'automatic', 'automatically', 'sync', 'cloud', 'backup', 'data', 'storage'],
        question: 'Is my data saved automatically?',
        answer: 'Yes! All your data is automatically saved to Firebase cloud storage in real-time. This includes:\n\n• Attendance records\n• Subjects and semesters\n• Profile information\n• Theme preferences\n\nData syncs across all your devices when you sign in!'
      },
      {
        id: 30,
        keywords: ['privacy', 'data', 'secure', 'security', 'safe', 'who', 'access', 'see', 'protection'],
        question: 'Is my data private and secure?',
        answer: 'Yes! Your data is protected:\n\n• Stored securely in Firebase with encryption\n• Only you can access your attendance records\n• No third-party sharing without consent\n• Admin access is logged and monitored\n\nRead our full Privacy Policy in Settings for more details.'
      },
      {
        id: 31,
        keywords: ['delete', 'account', 'remove', 'data', 'erase', 'gdpr', 'management'],
        question: 'Can I delete my account and data?',
        answer: 'Yes, you can manage your account and data in Settings:\n1. Go to **Settings** > **Account Management**\n2. Click "**Delete Account**"\n3. Confirm the permanent deletion in the pop-up window\n\n⚠️ This action will permanently erase all your attendance records and profile data. It cannot be undone!'
      },

      // === NOTIFICATIONS ===
      {
        id: 32,
        keywords: ['notification', 'notifications', 'remind', 'reminder', 'alert', 'push', 'notify'],
        question: 'Does the app send reminders?',
        answer: 'The app shows in-app warnings when your attendance drops below safe levels. Browser push notifications depend on your device settings.\n\nTo enable notifications, check your browser settings and allow notifications from this site.'
      },

      // === NAVIGATION ===
      {
        id: 33,
        keywords: ['navigate', 'navigation', 'pages', 'menu', 'tabs', 'sections'],
        question: 'How do I navigate the app?',
        answer: 'Use the navigation bar at the top:\n\n• Dashboard - Overview and quick actions\n• Attendance - Mark daily attendance\n• Reports - Weekly attendance charts\n• Total - All subjects statistics\n• Settings - Profile, subjects, themes\n\nOn mobile, tap the hamburger menu icon to access navigation.'
      },
      {
        id: 34,
        keywords: ['mobile', 'phone', 'responsive', 'touch', 'tablet'],
        question: 'Does the app work on mobile?',
        answer: 'Yes! The app is fully responsive and works great on:\n\n• Smartphones (iOS & Android)\n• Tablets\n• Desktop computers\n\nAll features work the same across devices. Your data syncs automatically!'
      },

      // === TROUBLESHOOTING ===
      {
        id: 35,
        keywords: ['error', 'bug', 'problem', 'issue', 'not working', 'broken', 'help', 'support'],
        question: 'How do I report a problem?',
        answer: 'To report a bug or issue:\n1. Go to Settings page\n2. Find "Report a Problem" section\n3. Select the problem type (Bug, Crash, Feature Request, Other)\n4. Describe the issue in detail\n5. Click Submit\n\nOr email us directly at lyssa.phat@gmail.com'
      },
      {
        id: 36,
        keywords: ['contact', 'email', 'support', 'help', 'reach', 'team'],
        question: 'How do I contact support?',
        answer: 'You can reach our support team:\n\nEmail: lyssa.phat@gmail.com\n\nWe typically respond within 24-48 hours. Include as much detail as possible about your question or issue!'
      },
      {
        id: 37,
        keywords: ['offline', 'internet', 'connection', 'no wifi', 'network'],
        question: 'Does the app work offline?',
        answer: 'The app requires an internet connection to:\n• Sign in/out\n• Sync attendance data\n• Save changes\n\nIf you lose connection, changes may not be saved. Make sure you have a stable connection when marking attendance.'
      },

      // === APP INFO ===
      {
        id: 38,
        keywords: ['about', 'app', 'application', 'what', 'purpose', 'use', 'for'],
        question: 'What is Attendance Tracker?',
        answer: 'Attendance Tracker is a web application for students to:\n\n• Track daily class attendance\n• View weekly and semester reports\n• Monitor attendance percentages\n• Get warnings for low attendance\n• Export data to Excel\n• Maintain attendance streaks\n\nIt\'s built to help students stay on top of their academic attendance!'
      },
      {
        id: 39,
        keywords: ['free', 'cost', 'price', 'pay', 'subscription', 'premium'],
        question: 'Is Attendance Tracker free?',
        answer: 'Yes! Attendance Tracker is completely free to use. All features are available to everyone:\n\n• Unlimited subjects and semesters\n• Full reporting and export features\n• All themes and customization options\n• Cloud sync across devices\n\nNo hidden costs or premium features!'
      },
      {
        id: 40,
        keywords: ['terms', 'service', 'rules', 'agreement', 'tos', 'legal'],
        question: 'Where can I read the Terms of Service?',
        answer: 'You can read our Terms of Service at:\n• Click the link in the sign-in modal footer\n• Or visit the terms.html page directly\n\nBy using the app, you agree to our terms including proper use of the attendance tracking features.'
      },
      {
        id: 41,
        keywords: ['privacy', 'policy', 'data', 'information', 'collection'],
        question: 'Where is the Privacy Policy?',
        answer: 'You can read our Privacy Policy at:\n• Click the link in the sign-in modal footer\n• Or visit the privacy.html page directly\n\nIt explains what data we collect, how we use it, and your rights regarding your information.'
      },

      // === FOCUS & TIMER ===
      {
        id: 50,
        keywords: ['focus', 'timer', 'pomodoro', 'study', 'concentrate', 'work', 'break', 'session'],
        question: 'What is the Focus page?',
        answer: 'The Focus page features a customizable timer to help you study effectively:\n\n• Focus Mode: 25-minute work sessions\n• Short Break: 5-minute relax time\n• Long Break: 15-minute recharge\n\nYou can also set a custom time!'
      },
      {
        id: 51,
        keywords: ['task', 'tasks', 'todo', 'list', 'add', 'create', 'note', 'reminder'],
        question: 'How do I manage tasks?',
        answer: 'You can manage tasks on the Focus page:\n\n• Add: Type in the "What\'s on your mind?" box and click the + button\n• Complete: Click the checkbox to finish a task\n• View Completed: Click "Show Completed" to see finished items\n\nYour tasks are saved automatically to the cloud!'
      },
      {
        id: 52,
        keywords: ['quote', 'quotes', 'motivation', 'inspire', 'inspiration', 'message'],
        question: 'How often do quotes change?',
        answer: 'Motivational quotes on the Focus page refresh automatically every minute to keep you inspired. You can also switch modes to see a fresh quote immediately!'
      },

      // === DAYS & SCHEDULE ===
      {
        id: 42,
        keywords: ['days', 'week', 'schedule', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        question: 'How does the weekly schedule work?',
        answer: 'When you create a subject, you assign it to specific days of the week. The app automatically shows only subjects scheduled for each day:\n\n• Sunday through Saturday support\n• Subjects only appear on their scheduled days\n• The week starts from your semester start date\n\nYou can have different subjects on different days!'
      },
      {
        id: 43,
        keywords: ['date', 'picker', 'calendar', 'select', 'dates'],
        question: 'How do I select dates?',
        answer: 'The app uses custom date pickers:\n\n• Click on the date field to open the calendar\n• Navigate months using arrow buttons\n• Click on a date to select it\n• The selected date is highlighted\n\nUsed for semester dates and viewing past attendance.'
      }
    ];

    // Stop words to filter out
    this.stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'all', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
      'because', 'until', 'while', 'although', 'though', 'after', 'before',
      'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours',
      'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them',
      'whom', 'this', 'that', 'these', 'those', 'am',
      'please', 'want', 'like'
    ]);

    // Greeting messages (no emoji)
    this.greetings = [
      "Hi there! I'm your Attendance Tracker assistant. Ask me anything about using the app!",
      "Hello! I can help you with attendance tracking, reports, settings, themes, and more. What would you like to know?",
      "Hey! Need help with the app? Just type your question and I'll find the best answer for you."
    ];

    // Fallback responses (no emoji) - includes contact link
    this.fallbacks = [
      "Hmm, I'm not sure about that. Could you try rephrasing your question? Or <a href=\"#\" class=\"contact-link\">contact us</a> for help.",
      "I don't have information on that specific topic. Try asking about attendance, subjects, reports, settings, themes, or account features! Or <a href=\"#\" class=\"contact-link\">contact our team</a>.",
      "Sorry, I couldn't find a matching answer. Here are some things I can help with:\n\n• Marking and editing attendance\n• Managing subjects and semesters\n• Viewing reports and exporting data\n• Themes and personalization\n• Account and profile settings\n\nStill need help? <a href=\"#\" class=\"contact-link\">Contact us</a>"
    ];

    // Suggested questions
    this.suggestedQuestions = [
      "How do I mark attendance?",
      "Can I edit past records?",
      "How to export data?",
      "How to change themes?"
    ];
  }

  initialize() {
    this.fab = document.getElementById('assistant-fab');
    this.overlay = document.getElementById('assistant-overlay');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    const closeBtn = document.getElementById('assistant-close');
    const sendBtn = document.getElementById('chat-send');

    if (this.fab) {
      this.fab.addEventListener('click', () => this.toggleAssistant());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeAssistant());
    }

    // Close on overlay click (outside panel)
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.closeAssistant();
        }
      });
    }

    // Send button
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.handleUserInput());
    }

    // Enter to send
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleUserInput();
        }
      });
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeAssistant();
      }
    });

    // Setup suggested question clicks
    this.setupSuggestedQuestions();

    // Setup contact link clicks
    this.setupContactLinks();
  }

  setupContactLinks() {
    document.addEventListener('click', (e) => {
      const contactLink = e.target.closest('.contact-link');
      if (contactLink) {
        e.preventDefault();
        this.closeAssistant();
        // Navigate to Settings page
        const settingsTab = document.querySelector('[data-page="Settings"]');
        if (settingsTab) {
          settingsTab.click();
          // Scroll to the report problem section after a short delay
          setTimeout(() => {
            const reportSection = document.getElementById('report-problem-section') ||
              document.querySelector('.report-problem-card') ||
              document.querySelector('[class*="report"]');
            if (reportSection) {
              reportSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              // Just scroll to bottom where contact usually is
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
          }, 300);
        }
      }
    });
  }

  setupSuggestedQuestions() {
    document.addEventListener('click', (e) => {
      const suggestionBtn = e.target.closest('.suggestion-btn');
      if (suggestionBtn) {
        const question = suggestionBtn.dataset.question;
        if (question && this.chatInput) {
          this.chatInput.value = question;
          this.handleUserInput();
        }
      }
    });
  }

  toggleAssistant() {
    if (this.isOpen) {
      this.closeAssistant();
    } else {
      this.openAssistant();
    }
  }

  openAssistant() {
    if (this.overlay) {
      this.overlay.classList.add('open');
      this.isOpen = true;

      // Show greeting if chat is empty
      if (this.chatMessages && this.chatMessages.children.length === 0) {
        this.showGreeting();
      }

      // Focus input
      setTimeout(() => {
        if (this.chatInput) this.chatInput.focus();
      }, 300);
    }
  }

  closeAssistant() {
    if (this.overlay) {
      this.overlay.classList.remove('open');
      this.isOpen = false;
    }
  }

  showGreeting() {
    const greeting = this.greetings[Math.floor(Math.random() * this.greetings.length)];
    this.addBotMessage(greeting);
    this.showSuggestions();
  }

  showSuggestions() {
    if (!this.chatMessages) return;

    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'chat-suggestions';
    suggestionsDiv.innerHTML = `
      <div class="suggestions-label">Try asking:</div>
      <div class="suggestions-list">
        ${this.suggestedQuestions.map(q =>
      `<button class="suggestion-btn" data-question="${q}">${q}</button>`
    ).join('')}
      </div>
    `;
    this.chatMessages.appendChild(suggestionsDiv);
    this.scrollToBottom();
  }

  handleUserInput() {
    if (!this.chatInput || !this.chatMessages) return;

    const userText = this.chatInput.value.trim();
    if (!userText) return;

    // Clear input
    this.chatInput.value = '';

    // Remove any existing suggestions
    const existingSuggestions = this.chatMessages.querySelectorAll('.chat-suggestions');
    existingSuggestions.forEach(el => el.remove());

    // Add user message
    this.addUserMessage(userText);

    // Check for profanity
    if (this.checkProfanity(userText)) {
      this.showTypingIndicator();
      setTimeout(() => {
        this.removeTypingIndicator();
        this.addBotMessage("I prefer to keep our conversation polite. Please use appropriate language so I can help you.");
      }, 500);
      return;
    }

    // Show typing indicator
    this.showTypingIndicator();

    // Find best match and respond
    setTimeout(() => {
      this.removeTypingIndicator();
      const response = this.findBestMatch(userText);
      this.addBotMessage(response);
    }, 500 + Math.random() * 500); // 500-1000ms delay for natural feel
  }

  addUserMessage(text) {
    if (!this.chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-bubble user';
    messageDiv.innerHTML = `<div class="bubble-content">${this.escapeHtml(text)}</div>`;
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  addBotMessage(text) {
    if (!this.chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-bubble bot';
    messageDiv.innerHTML = `
      <div class="bot-avatar">
        <img src="assets/new-bot-icon.png" alt="Assistant">
      </div>
      <div class="bubble-content">${this.formatMessage(text)}</div>
    `;
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    if (!this.chatMessages) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-bubble bot typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="bot-avatar">
        <img src="assets/new-bot-icon.png" alt="Assistant">
      </div>
      <div class="bubble-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    this.chatMessages.appendChild(typingDiv);
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  scrollToBottom() {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  }

  // Fuzzy matching algorithm
  findBestMatch(userInput) {
    const tokens = this.tokenize(userInput);

    if (tokens.length === 0) {
      return this.fallbacks[Math.floor(Math.random() * this.fallbacks.length)];
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const qa of this.knowledgeBase) {
      let score = 0;

      // Check keyword matches
      for (const token of tokens) {
        for (const keyword of qa.keywords) {
          // Exact match
          if (keyword === token) {
            score += 10;
          }
          // Partial match (token contains keyword or vice versa)
          else if (keyword.includes(token) || token.includes(keyword)) {
            score += 5;
          }
          // Fuzzy match using Levenshtein distance
          else if (this.levenshteinDistance(keyword, token) <= 2) {
            score += 3;
          }
        }
      }

      // Check question text match
      const questionTokens = this.tokenize(qa.question);
      for (const token of tokens) {
        if (questionTokens.includes(token)) {
          score += 7;
        }
      }

      // Check answer text for additional context
      let answerText = qa.answer;
      if (Array.isArray(answerText)) {
        answerText = answerText.join(' ');
      }
      const answerTokens = this.tokenize(answerText);
      for (const token of tokens) {
        if (answerTokens.includes(token)) {
          score += 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = qa;
      }
    }

    // Return best match or fallback
    if (bestMatch && bestScore >= 5) {
      if (Array.isArray(bestMatch.answer)) {
        return bestMatch.answer[Math.floor(Math.random() * bestMatch.answer.length)];
      }
      return bestMatch.answer;
    } else {
      return this.fallbacks[Math.floor(Math.random() * this.fallbacks.length)];
    }
  }

  // Tokenize input: lowercase, remove punctuation, filter stop words
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !this.stopWords.has(word));
  }

  // Levenshtein distance for typo tolerance
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;

    // Quick exit for short strings
    if (m === 0) return n;
    if (n === 0) return m;
    if (Math.abs(m - n) > 3) return 999; // Too different

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  }

  checkProfanity(text) {
    const badWords = ['fuck', 'shit', 'bitch', 'bastard', 'cunt', 'dick', 'cock', 'piss', 'whore', 'slut', 'asshole', 'motherfucker', 'wanker'];
    const lowerText = text.toLowerCase();
    return badWords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(lowerText));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatMessage(text) {
    // Convert newlines to <br> and escape HTML, but preserve contact links
    // First, temporarily replace contact links with a placeholder
    const linkPlaceholder = '___CONTACT_LINK___';
    const linkMatch = text.match(/<a href="#" class="contact-link">[^<]+<\/a>/g) || [];
    let processedText = text;

    linkMatch.forEach((link, i) => {
      processedText = processedText.replace(link, `${linkPlaceholder}${i}`);
    });

    // Escape HTML and convert newlines
    processedText = processedText
      .split('\n')
      .map(line => this.escapeHtml(line))
      .join('<br>');

    // Restore the contact links
    linkMatch.forEach((link, i) => {
      processedText = processedText.replace(`${linkPlaceholder}${i}`, link);
    });

    return processedText;
  }
}

export default new AssistantManager();