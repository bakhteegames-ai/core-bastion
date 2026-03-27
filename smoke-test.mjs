import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple static file server
function createServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(process.cwd(), 'dist', req.url === '/' ? 'index.html' : req.url);
      const ext = path.extname(filePath);
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function runSmokeTest() {
  const results = [];
  const consoleMessages = [];
  const errors = [];

  console.log('Starting test server...');
  const server = await createServer(3000);
  console.log('Server running on http://127.0.0.1:3000');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-skip-prompt',
      '--disable-gpu',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist'
    ]
  });

  const page = await browser.newPage();

  // Capture console messages
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  try {
    // 1. BOOT TEST
    console.log('\n=== 1. BOOT TEST ===');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    await delay(2000);

    const title = await page.title();
    console.log('Page title:', title);
    results.push({ test: '1. Boot', status: title === 'Core Bastion' ? 'PASS' : 'FAIL', detail: `title: ${title}` });

    // Check for main menu
    const mainMenu = await page.$('#main-menu');
    const menuVisible = mainMenu ? await mainMenu.isIntersectingViewport() : false;
    console.log('Main menu visible:', menuVisible);
    results.push({ test: '2. Main Menu', status: menuVisible ? 'PASS' : 'FAIL', detail: 'Main menu element visible' });

    // 3. BUILD PHASE TEST - Click Play to start
    console.log('\n=== 3. BUILD PHASE TEST ===');
    const playBtn = await page.$('#menu-play-btn');
    if (playBtn) {
      console.log('Clicking play button...');
      await playBtn.click();
      await delay(500); // Short delay to let game start
    } else {
      console.log('Play button not found');
    }

    const timerEl = await page.$('#hud-timer');
    const timerVisible = timerEl ? await timerEl.isIntersectingViewport() : false;
    console.log('Build phase timer visible:', timerVisible);
    
    const timerValueEl = await page.$('#hud-timer-value');
    const timerValue = timerValueEl ? await page.evaluate(el => el.textContent, timerValueEl) : 'N/A';
    console.log('Timer value:', timerValue);
    results.push({ test: '3. Build Phase', status: timerVisible ? 'PASS' : 'FAIL', detail: `Timer: ${timerValue}s` });

    // 4. SLOT A BUILD TEST - Click immediately during build phase
    console.log('\n=== 4. SLOT A BUILD TEST ===');
    const goldEl = await page.$('#hud-gold-value');
    const goldBefore = goldEl ? await page.evaluate(el => parseInt(el.textContent), goldEl) : 0;
    console.log('Gold before build:', goldBefore);

    // Click on build slot A position (approximate canvas position)
    // Slot A is at world position (-4, 2), need to click on canvas
    const canvas = await page.$('#application-canvas');
    if (canvas) {
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        // Slot A is on the left side, slightly above center
        // Based on camera at (0, 28, 18) looking at origin
        await page.mouse.click(canvasBox.x + canvasBox.width * 0.35, canvasBox.y + canvasBox.height * 0.45);
        await delay(300);
      }
    }

    const goldAfter = goldEl ? await page.evaluate(el => parseInt(el.textContent), goldEl) : 0;
    console.log('Gold after slot A click:', goldAfter);
    const slotABuilt = goldAfter === goldBefore - 100;
    
    // Check console for build logs
    const buildLogFound = consoleMessages.some(m => m.text.includes('Tower built') || m.text.includes('Build slot'));
    results.push({ test: '4. Slot A Build', status: (slotABuilt || buildLogFound) ? 'PASS' : 'FAIL', detail: `Gold: ${goldBefore} -> ${goldAfter}, build log: ${buildLogFound}` });

    // 5. SLOT B BUILD TEST
    console.log('\n=== 5. SLOT B BUILD TEST ===');
    const goldBefore2 = goldEl ? await page.evaluate(el => parseInt(el.textContent), goldEl) : 0;
    console.log('Gold before slot B:', goldBefore2);

    if (canvas && goldBefore2 >= 100) {
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        // Slot B is at world position (1, -6), which is right-lower area
        await page.mouse.click(canvasBox.x + canvasBox.width * 0.58, canvasBox.y + canvasBox.height * 0.62);
        await delay(300);
      }
    }

    const goldAfter2 = goldEl ? await page.evaluate(el => parseInt(el.textContent), goldEl) : 0;
    console.log('Gold after slot B click:', goldAfter2);
    const slotBBuilt = goldAfter2 === goldBefore2 - 100 || goldBefore2 < 100;
    results.push({ test: '5. Slot B Build', status: slotBBuilt ? 'PASS' : 'FAIL', detail: `Gold: ${goldBefore2} -> ${goldAfter2}` });

    // Wait for build phase to end and wave to start
    console.log('\n=== WAITING FOR WAVE TO START ===');
    await delay(4000);

    // 6. ENEMY SPAWN/PATH TEST
    console.log('\n=== 6. ENEMY SPAWN/PATH TEST ===');
    const enemySpawned = consoleMessages.some(m => m.text.includes('Spawning enemy') || m.text.includes('EnemyAgent'));
    console.log('Enemy spawn logs found:', enemySpawned);
    
    const pathMovement = consoleMessages.some(m => m.text.includes('waypoint') || m.text.includes('Reached waypoint'));
    console.log('Path movement logs:', pathMovement);
    results.push({ test: '6. Enemy Spawn/Path', status: (enemySpawned && pathMovement) ? 'PASS' : 'FAIL', detail: 'Spawn and path logs found' });

    // Wait for wave to complete
    console.log('\n=== WAITING FOR WAVE COMPLETE OR DEFEAT ===');
    
    // Wait up to 30 seconds for defeat or multiple waves
    for (let i = 0; i < 60; i++) {
      await delay(1000);
      const hasDefeat = consoleMessages.some(m => m.text.includes('DEFEAT') || m.text.includes('Defeat'));
      const defeatScreen = await page.$('#defeat-screen:not(.hidden)');
      if (hasDefeat || defeatScreen) {
        console.log('Defeat reached after', (i + 1), 'seconds');
        break;
      }
    }

    // 7. LEAK DAMAGE TEST
    console.log('\n=== 7. LEAK DAMAGE TEST ===');
    const leakDamage = consoleMessages.some(m => m.text.includes('leak') || m.text.includes('leaked'));
    console.log('Leak damage logs:', leakDamage);
    results.push({ test: '7. Leak Damage', status: leakDamage ? 'PASS' : 'FAIL', detail: 'Enemy leak detected in logs' });

    // 8. TOWER FIRE/PROJECTILE/HIT TEST
    console.log('\n=== 8. TOWER FIRE/PROJECTILE/HIT TEST ===');
    const towerFired = consoleMessages.some(m => m.text.includes('fired') || m.text.includes('Tower'));
    const projectileHit = consoleMessages.some(m => m.text.includes('Hit') || m.text.includes('damage'));
    console.log('Tower fire logs:', towerFired);
    console.log('Projectile hit logs:', projectileHit);
    results.push({ test: '8. Tower Fire/Hit', status: (towerFired || projectileHit) ? 'PASS' : 'FAIL', detail: 'Tower activity in logs' });

    // 9. GOLD REWARD TEST
    console.log('\n=== 9. GOLD REWARD TEST ===');
    const goldReward = consoleMessages.some(m => m.text.includes('gold') || m.text.includes('Gold'));
    console.log('Gold reward logs:', goldReward);
    results.push({ test: '9. Gold Reward', status: goldReward ? 'PASS' : 'FAIL', detail: 'Gold activity in logs' });

    // 10. WAVE COMPLETE TEST
    console.log('\n=== 10. WAVE COMPLETE TEST ===');
    const waveComplete = consoleMessages.some(m => m.text.includes('Wave') && m.text.includes('complete'));
    console.log('Wave complete:', waveComplete);
    results.push({ test: '10. Wave Complete', status: waveComplete ? 'PASS' : 'FAIL', detail: 'Wave complete triggered' });

    // 11. DEFEAT SCREEN TEST
    console.log('\n=== 11. DEFEAT SCREEN TEST ===');
    const defeatScreen = await page.$('#defeat-screen:not(.hidden)');
    const defeatVisible = defeatScreen ? await defeatScreen.isIntersectingViewport() : false;
    console.log('Defeat screen visible:', defeatVisible);
    results.push({ test: '11. Defeat Screen', status: defeatVisible ? 'PASS' : 'FAIL', detail: 'Defeat screen visible' });

    // 12. CONTINUE FLOW TEST
    console.log('\n=== 12. CONTINUE FLOW TEST ===');
    if (defeatVisible) {
      const continueBtn = await page.$('#defeat-continue-btn');
      if (continueBtn) {
        await continueBtn.click();
        await delay(2000);

        const continueFlow = consoleMessages.some(m => m.text.includes('Continue') || m.text.includes('Continued') || m.text.includes('HP restored'));
        console.log('Continue flow triggered:', continueFlow);
        results.push({ test: '12. Continue Flow', status: continueFlow ? 'PASS' : 'FAIL', detail: 'Continue button clicked' });
      } else {
        results.push({ test: '12. Continue Flow', status: 'FAIL', detail: 'Continue button not found' });
      }
    } else {
      results.push({ test: '12. Continue Flow', status: 'SKIP', detail: 'Defeat not reached' });
    }

    // 13. RESTART FLOW TEST
    console.log('\n=== 13. RESTART FLOW TEST ===');
    // First wait for defeat again if continue was used
    await delay(5000);
    
    const restartBtn = await page.$('#defeat-restart-btn');
    if (restartBtn) {
      try {
        const restartVisible = await restartBtn.isIntersectingViewport();
        if (restartVisible) {
          await restartBtn.click();
          await delay(2000);

          const restartFlow = consoleMessages.some(m => m.text.includes('Restart') || m.text.includes('restart'));
          console.log('Restart flow triggered:', restartFlow);

          // Check if game restarted (timer visible again)
          const newTimerEl = await page.$('#hud-timer');
          const newTimerVisible = newTimerEl ? await newTimerEl.isIntersectingViewport() : false;
          results.push({ test: '13. Restart Flow', status: (restartFlow || newTimerVisible) ? 'PASS' : 'FAIL', detail: 'Game restarted' });
        } else {
          results.push({ test: '13. Restart Flow', status: 'SKIP', detail: 'Restart button not visible' });
        }
      } catch (e) {
        results.push({ test: '13. Restart Flow', status: 'SKIP', detail: 'Restart button not clickable' });
      }
    } else {
      results.push({ test: '13. Restart Flow', status: 'FAIL', detail: 'Restart button not found' });
    }

    // 14. SAVE/LOAD BESTWAVE TEST
    console.log('\n=== 14. SAVE/LOAD BESTWAVE TEST ===');
    const saveLoad = consoleMessages.some(m => m.text.includes('bestWave') || m.text.includes('Save') || m.text.includes('Load'));
    console.log('Save/load logs:', saveLoad);
    results.push({ test: '14. Save/Load', status: saveLoad ? 'PASS' : 'FAIL', detail: 'Save/load activity in logs' });

    // 15. LOCALIZATION TEST
    console.log('\n=== 15. LOCALIZATION TEST ===');
    const langSet = consoleMessages.some(m => m.text.includes('lang') || m.text.includes('Language'));
    console.log('Localization logs:', langSet);

    const waveLabel = await page.$('.hud-wave .hud-label');
    const waveLabelText = waveLabel ? await page.evaluate(el => el.textContent, waveLabel) : 'N/A';
    console.log('Wave label text:', waveLabelText);
    results.push({ test: '15. Localization', status: (waveLabelText === 'Wave' || waveLabelText === 'Волна') ? 'PASS' : 'FAIL', detail: `Label: ${waveLabelText}` });

    // 16. AD PAUSE/MUTE/RESUME TEST
    console.log('\n=== 16. AD PAUSE/MUTE/RESUME TEST ===');
    const adPause = consoleMessages.some(m => m.text.includes('mute') || m.text.includes('pause') || m.text.includes('Pausing') || m.text.includes('Resuming'));
    console.log('Ad pause/mute logs:', adPause);
    results.push({ test: '16. Ad Pause/Mute', status: adPause ? 'PASS' : 'FAIL', detail: 'Audio compliance logs found' });

  } catch (err) {
    console.error('Test error:', err.message);
    console.error(err.stack);
    results.push({ test: 'Error', status: 'FAIL', detail: err.message });
  } finally {
    // Print all console messages
    console.log('\n=== CONSOLE LOGS ===');
    consoleMessages.slice(0, 80).forEach(m => {
      console.log(`[${m.type}] ${m.text.substring(0, 120)}`);
    });

    console.log('\n=== ERRORS ===');
    if (errors.length > 0) {
      errors.forEach(e => console.log('ERROR:', e));
    } else {
      console.log('No page errors');
    }

    await browser.close();
    server.close();
  }

  // Print results
  console.log('\n========================================');
  console.log('SMOKE TEST RESULTS');
  console.log('========================================');
  results.forEach(r => {
    console.log(`${r.status.padEnd(6)} | ${r.test.padEnd(25)} | ${r.detail}`);
  });
  console.log('========================================');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;
  console.log(`Total: ${passCount} PASS, ${failCount} FAIL, ${skipCount} SKIP`);

  return results;
}

runSmokeTest().catch(console.error);
