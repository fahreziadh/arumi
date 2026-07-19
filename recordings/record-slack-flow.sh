#!/usr/bin/env bash
# Capture the Arumi "Slack Discussion" test flow as screenshots, then encode to MP4.
# Recording the browser tab directly via ffmpeg/AVFoundation is blocked in this
# sandbox (no Screen Recording permission + headless screencast yields 0 frames),
# so we drive the real browser via agent-browser and assemble a real video file.
set -e
cd /Users/fahrezi/work/garage/arumi
agent-browser close --all 2>/dev/null || true
sleep 1
mkdir -p recordings/frames

ref() { # current ref for a snapshot line matching $1
  agent-browser snapshot 2>/dev/null | grep -iE "$1" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//'
}
shot() { agent-browser screenshot "recordings/frames/$1.png" >/dev/null 2>&1; }

# 1) Home
agent-browser open http://localhost:3000 >/dev/null 2>&1
sleep 2.5
shot frame_home

# 2) Prepare step (click Slack Discussion)
SLACK=$(ref 'link "Slack Discussion')
agent-browser click "$SLACK"
sleep 2.5
shot frame_prepare

# 3) Fill the topic
ANS=$(ref 'Your answer')
agent-browser fill "$ANS" "I want to plan the next release with my team"
sleep 1.2
shot frame_filled

# 4) Confirm step (Send answer)
SEND=$(ref 'button "Send answer')
agent-browser click "$SEND"
sleep 3
shot frame_confirm

# 5) Chat room (Start session)
START=$(ref 'button "Start session')
agent-browser click "$START"
sleep 3.5
shot frame_chat

# 6) Type the message
MSG=$(ref 'Your message')
agent-browser fill "$MSG" "Can we ship on Friday?"
sleep 1.2
shot frame_msgtyped

# 7) Send the message (reply should appear)
SENDM=$(ref 'button "Send message')
agent-browser click "$SENDM"
sleep 6
shot frame_sent

# ---- Encode to MP4 ----
cat > recordings/frames/list.txt <<'EOF'
file 'frame_home.png'
duration 3
file 'frame_prepare.png'
duration 3
file 'frame_filled.png'
duration 2
file 'frame_confirm.png'
duration 3
file 'frame_chat.png'
duration 3
file 'frame_msgtyped.png'
duration 2
file 'frame_sent.png'
duration 4
file 'frame_sent.png'
duration 1
EOF

ffmpeg -y -f concat -safe 0 -i recordings/frames/list.txt \
  -vsync vfr -pix_fmt yuv420p -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" \
  -c:v libx264 -r 25 recordings/slack-flow.mp4 2>&1 | tail -5

echo "=== DONE ==="
ls -la recordings/slack-flow.mp4
agent-browser close --all 2>/dev/null || true
