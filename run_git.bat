@echo off
git config user.name "ulasbey"
git config user.email "ulasbey@users.noreply.github.com"
git add .
git commit -m "Initial commit - Missing Club"
git branch -M main
git remote add origin https://github.com/ulasbey/missing-club.git
git push -u origin main
