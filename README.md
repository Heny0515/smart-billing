🧾 AI-powered Smart Billing System using Camera-Based Product Detection and Automatic Cart Generation
🚀 Problem Statement

Traditional billing systems rely heavily on barcode scanners and human intervention. This leads to:

Long checkout queues
Increased operational costs (staff + hardware)
Human errors in billing
Inefficiency in modern retail environments
💡 Solution

Our system eliminates the need for barcode scanners and manual billing by using a camera-based product detection system.

🔄 How it works:
Customer picks up a product
Camera detects the item using a trained AI model
Item is automatically added to the cart
Users can manage quantity or manually add items if needed
Bill is generated instantly
Payment is completed via Razorpay
Bill details are sent via Twilio

⚙️ Tech Stack:
🖥️ Frontend
HTML
CSS
JavaScript

🤖 AI / Detection
Teachable Machine (custom-trained model on product images)

🌐 Deployment
Wasmer

📡 Integrations
Twilio → for sending bill notifications
Razorpay → for secure online payments

✨ Features:
📸 Camera-based product detection
🛒 Automatic cart generation
➕ Manual item addition (fallback system)
🔢 Quantity management inside cart
💳 Integrated Razorpay payment system
📩 Twilio notifications for billing details
🌍 Multiple language support
👥 Split bill between multiple users
🎨 Smooth and user-friendly UI

👥 Team:
Something Like Tech

🏁 Future Scope:
Improve AI accuracy with larger datasets
Add real-time object tracking for multiple items
Integrate with smart carts / IoT devices
Add voice assistant for hands-free interaction
Add retailer dashboard for inventory management
Enable real-time stock tracking and sales analytics
Implement low-stock alerts and auto restocking system
Integrate full smart retail ecosystem with billing + inventory

💥 Why This Matters:
This project brings us one step closer to fully automated retail systems, reducing dependency on hardware and manpower while enhancing user experience.
