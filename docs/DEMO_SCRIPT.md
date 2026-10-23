# HomePilot Demo Script (< 3 minutes)

**Audience:** Amazon Ring Hackathon judges / general smart-home audience.

---

**0:00 – 0:20  Hook**  
"HomePilot is one app for lights, climate, energy, water, and Ring security — with optional local AI and a full device simulator so you can evaluate everything today."

**0:20 – 0:50  Dashboard & Control**  
Open the app (demo@homepilot.app). Show live system health. Toggle Living Light brightness, change Living Fan speed, set AC to 24°C. Point out capability badges and "Simulated" labels.

**0:50 – 1:20  Energy**  
Open Energy Analytics. Show live power, today's kWh, estimated cost, and the 24h chart updating from the simulator. Export CSV mention.

**1:20 – 1:50  Ring Track**  
Open Ring Security. Inject a demo motion event (or show a real webhook if credentials exist). Notification appears. Mention the automation "Ring motion → lighting" and that cameras are not treated as appliance controllers.

**1:50 – 2:20  AI Assistant**  
Say: "Turn off the bedroom lights." Show structured intent → command → state update. Note that without an AI endpoint the same phrase works via rules.

**2:20 – 2:45  Water + Automation**  
Water tank level + pump. Brief automation list (bedtime schedule).

**2:45 – 3:00  Close**  
"Production-oriented stack: Expo, Fastify, Postgres, MQTT, Docker. Open source path for controllers. Ready for real hardware and Ring partner access."

---

**Backup if network fails:** All simulator state is local to MQTT + backend; charts still render from seeded history.
