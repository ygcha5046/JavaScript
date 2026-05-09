// High Quality FPS Game - JavaScript

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const radarCanvas = document.getElementById('radar');
const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;

canvas.width = 1400;
canvas.height = 800;

if (radarCanvas) {
    radarCanvas.width = 130;
    radarCanvas.height = 130;
}

// Weapon configurations
const weaponConfig = [
    {
        name: 'PISTOL',
        damage: 25,
        fireRate: 100,
        speed: 8,
        ammoPerClip: 15,
        maxAmmo: 60,
        spread: 0.05
    },
    {
        name: 'SHOTGUN',
        damage: 45,
        fireRate: 400,
        speed: 7,
        ammoPerClip: 6,
        maxAmmo: 24,
        spread: 0.3,
        pellets: 8
    },
    {
        name: 'RIFLE',
        damage: 50,
        fireRate: 80,
        speed: 10,
        ammoPerClip: 25,
        maxAmmo: 100,
        spread: 0.02
    },
    {
        name: 'LASER',
        damage: 35,
        fireRate: 60,
        speed: 12,
        ammoPerClip: 100,
        maxAmmo: 200,
        spread: 0.01
    }
];

// Player
const player = {
    x: 700,
    y: 400,
    width: 20,
    height: 20,
    angle: 0,
    hp: 100,
    maxHp: 100,
    score: 0,
    kills: 0,
    level: 1,
    speed: 5,
    shootCooldown: 0,
    weaponIndex: 0,
    ammo: 15,
    reloadCooldown: 0,
    screenShake: 0
};

// Game state
const gameState = {
    running: false,
    started: false,
    enemies: [],
    projectiles: [],
    particles: [],
    explosions: [],
    spawnTimer: 0,
    difficulty: 1,
    enemyCount: 0,
    maxEnemies: 5,
    wave: 1,
    waveTimer: 0,
    waveInterval: 300,
    powerUps: []
};

// Input
const keys = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    const key = e.key;
    if (key === '1' && gameState.started) switchWeapon(0);
    if (key === '2' && gameState.started) switchWeapon(1);
    if (key === '3' && gameState.started) switchWeapon(2);
    if (key === '4' && gameState.started) switchWeapon(3);
    if (key.toLowerCase() === 'r' && gameState.started) reload();
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (gameState.started) shoot();
});

function startGame() {
    document.getElementById('menu').style.display = 'none';
    gameState.started = true;
    gameState.running = true;
    player.hp = player.maxHp;
    player.kills = 0;
    player.score = 0;
    player.level = 1;
    gameState.wave = 1;
    gameState.difficulty = 1;
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.particles = [];
    gameState.maxEnemies = 5;
    gameState.spawnTimer = 0;
    gameState.waveTimer = 0;
}

function switchWeapon(index) {
    player.weaponIndex = index;
    const weapon = weaponConfig[index];
    player.ammo = weapon.ammoPerClip;
    player.shootCooldown = 0;
    updateWeaponUI();
}

function reload() {
    const weapon = weaponConfig[player.weaponIndex];
    player.ammo = weapon.ammoPerClip;
}

function updateWeaponUI() {
    const weapon = weaponConfig[player.weaponIndex];
    document.getElementById('weaponName').textContent = weapon.name;
    document.querySelectorAll('.weapon-item').forEach((el, idx) => {
        el.classList.toggle('active', idx === player.weaponIndex);
    });
}

// Enemy class
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        if (type === 'normal') {
            this.width = 20;
            this.height = 20;
            this.hp = 30 + gameState.difficulty * 5;
            this.speed = 2.5 + gameState.difficulty * 0.3;
            this.damage = 10;
            this.color = '#ff3333';
        } else if (type === 'fast') {
            this.width = 16;
            this.height = 16;
            this.hp = 15 + gameState.difficulty * 2;
            this.speed = 4 + gameState.difficulty * 0.5;
            this.damage = 8;
            this.color = '#ffaa00';
        } else if (type === 'heavy') {
            this.width = 28;
            this.height = 28;
            this.hp = 80 + gameState.difficulty * 15;
            this.speed = 1.5 + gameState.difficulty * 0.2;
            this.damage = 20;
            this.color = '#990000';
        }
        
        this.maxHp = this.hp;
        this.shootCooldown = 0;
    }

    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 30) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        this.x = Math.max(20, Math.min(canvas.width - 20, this.x));
        this.y = Math.max(20, Math.min(canvas.height - 20, this.y));

        this.shootCooldown--;
        if (this.shootCooldown <= 0 && distance < 400) {
            this.shoot();
            this.shootCooldown = this.type === 'fast' ? 80 : 120;
        }
    }

    shoot() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const projectile = new Projectile(
            this.x, this.y,
            (dx / distance) * 4,
            (dy / distance) * 4,
            this.damage,
            true
        );
        gameState.projectiles.push(projectile);
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        ctx.fillStyle = '#ff0000';
        const barWidth = this.width + 10;
        ctx.fillRect(this.x - barWidth / 2, this.y - this.height / 2 - 10, barWidth, 4);
        
        const healthPercent = this.hp / this.maxHp;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.height / 2 - 10, barWidth * healthPercent, 4);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    takeDamage(damage) {
        this.hp -= damage;
        return this.hp <= 0;
    }
}

// Projectile
class Projectile {
    constructor(x, y, vx, vy, damage, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.isEnemy = isEnemy;
        this.radius = isEnemy ? 4 : 3;
        this.life = 600;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    isOffScreen() {
        return this.x < -50 || this.x > canvas.width + 50 || 
               this.y < -50 || this.y > canvas.height + 50 || 
               this.life <= 0;
    }

    draw() {
        if (this.isEnemy) {
            ctx.fillStyle = '#ff9900';
            ctx.shadowColor = '#ff9900';
            ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = '#00ff00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 8;
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Particle
class Particle {
    constructor(x, y, vx, vy, color, life = 40) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life--;
    }

    draw() {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Explosion
class Explosion {
    constructor(x, y, size = 15) {
        this.x = x;
        this.y = y;
        this.size = 0;
        this.maxSize = size;
        this.life = 20;
    }

    update() {
        this.size += this.maxSize / 20;
        this.life--;
    }

    draw() {
        ctx.globalAlpha = this.life / 20;
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

// Power-up
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 300;
        this.size = 15;
    }

    update() {
        this.life--;
    }

    draw() {
        let color = '#00ff00';
        if (this.type === 'health') color = '#ff0000';
        if (this.type === 'ammo') color = '#ffd700';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function updatePlayer() {
    if (keys['w']) player.y -= player.speed;
    if (keys['s']) player.y += player.speed;
    if (keys['a']) player.x -= player.speed;
    if (keys['d']) player.x += player.speed;

    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    player.angle = Math.atan2(dy, dx);

    player.shootCooldown--;
    player.reloadCooldown--;
}

function shoot() {
    const weapon = weaponConfig[player.weaponIndex];
    
    if (player.ammo <= 0 || player.shootCooldown > 0) return;

    player.ammo--;
    player.shootCooldown = weapon.fireRate;
    player.screenShake = 5;

    if (weapon.pellets) {
        for (let i = 0; i < weapon.pellets; i++) {
            const angle = player.angle + (Math.random() - 0.5) * weapon.spread * 2;
            const projectile = new Projectile(
                player.x + Math.cos(player.angle) * 15,
                player.y + Math.sin(player.angle) * 15,
                Math.cos(angle) * weapon.speed,
                Math.sin(angle) * weapon.speed,
                weapon.damage / 2
            );
            gameState.projectiles.push(projectile);
        }
        gameState.explosions.push(new Explosion(player.x + Math.cos(player.angle) * 15, player.y + Math.sin(player.angle) * 15, 20));
    } else {
        const angle = player.angle + (Math.random() - 0.5) * weapon.spread;
        const projectile = new Projectile(
            player.x + Math.cos(player.angle) * 15,
            player.y + Math.sin(player.angle) * 15,
            Math.cos(angle) * weapon.speed,
            Math.sin(angle) * weapon.speed,
            weapon.damage
        );
        gameState.projectiles.push(projectile);
    }

    player.x -= Math.cos(player.angle) * 2;
    player.y -= Math.sin(player.angle) * 2;
}

function spawnEnemies() {
    gameState.spawnTimer++;
    gameState.waveTimer++;

    if (gameState.waveTimer > gameState.waveInterval) {
        gameState.wave++;
        gameState.waveTimer = 0;
        gameState.maxEnemies = Math.min(20, 5 + gameState.wave);
        gameState.difficulty += 0.3;
    }

    if (gameState.enemyCount < gameState.maxEnemies && gameState.spawnTimer > 40 - gameState.wave) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 500;
        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;

        let type = 'normal';
        if (Math.random() < 0.1 + gameState.wave * 0.02) type = 'fast';
        if (Math.random() < 0.05 + gameState.wave * 0.01) type = 'heavy';

        gameState.enemies.push(new Enemy(x, y, type));
        gameState.enemyCount++;
        gameState.spawnTimer = 0;
    }
}

function updateProjectiles() {
    gameState.projectiles = gameState.projectiles.filter(p => !p.isOffScreen());

    gameState.projectiles.forEach((proj, projIndex) => {
        proj.update();

        if (proj.isEnemy) return;

        gameState.enemies.forEach((enemy, enemyIndex) => {
            const dx = proj.x - enemy.x;
            const dy = proj.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 15) {
                if (enemy.takeDamage(proj.damage)) {
                    player.score += (100 + gameState.wave * 20) * (enemy.type === 'heavy' ? 3 : 1);
                    player.kills++;
                    gameState.enemyCount--;

                    for (let i = 0; i < 15; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 4 + 1;
                        gameState.particles.push(new Particle(
                            enemy.x, enemy.y,
                            Math.cos(angle) * speed,
                            Math.sin(angle) * speed,
                            enemy.color
                        ));
                    }

                    gameState.explosions.push(new Explosion(enemy.x, enemy.y, 20));

                    if (player.kills % (10 - Math.min(gameState.wave, 5)) === 0) {
                        player.level++;
                        player.maxHp += 15;
                        player.hp = player.maxHp;

                        const randType = Math.random() > 0.5 ? 'health' : 'ammo';
                        gameState.powerUps.push(new PowerUp(enemy.x, enemy.y, randType));
                    }

                    gameState.enemies.splice(enemyIndex, 1);
                }
                gameState.projectiles.splice(projIndex, 1);
            }
        });
    });

    gameState.projectiles.forEach((proj, projIndex) => {
        if (!proj.isEnemy) return;

        const dx = proj.x - player.x;
        const dy = proj.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {
            player.hp -= proj.damage;
            player.screenShake = 10;

            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                gameState.particles.push(new Particle(
                    player.x, player.y,
                    Math.cos(angle) * 2,
                    Math.sin(angle) * 2,
                    '#ff3333'
                ));
            }

            gameState.projectiles.splice(projIndex, 1);

            if (player.hp <= 0) {
                gameState.running = false;
                endGame();
            }
        }
    });
}

function updateParticles() {
    gameState.particles = gameState.particles.filter(p => p.life > 0);
    gameState.particles.forEach(p => p.update());
    gameState.explosions = gameState.explosions.filter(e => e.life > 0);
    gameState.explosions.forEach(e => e.update());
}

function checkPowerUps() {
    gameState.powerUps = gameState.powerUps.filter(p => p.life > 0);

    gameState.powerUps.forEach((powerUp, index) => {
        powerUp.update();

        const dx = player.x - powerUp.x;
        const dy = player.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 40) {
            if (powerUp.type === 'health') {
                player.hp = Math.min(player.maxHp, player.hp + 30);
            } else if (powerUp.type === 'ammo') {
                const weapon = weaponConfig[player.weaponIndex];
                player.ammo = weapon.ammoPerClip;
            }
            gameState.powerUps.splice(index, 1);
        }
    });
}

function checkCollisions() {
    gameState.enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 25) {
            player.hp -= 0.5;
            player.screenShake = 8;

            if (player.hp <= 0) {
                gameState.running = false;
                endGame();
            }
        }
    });
}

function drawRadar() {
    if (!radarCtx) return;

    radarCtx.fillStyle = '#001a00';
    radarCtx.fillRect(0, 0, radarCanvas.width, radarCanvas.height);

    radarCtx.strokeStyle = '#00ff00';
    radarCtx.lineWidth = 1;
    radarCtx.beginPath();
    radarCtx.arc(radarCanvas.width / 2, radarCanvas.height / 2, radarCanvas.width / 2 - 2, 0, Math.PI * 2);
    radarCtx.stroke();

    const scale = radarCanvas.width / 1000;

    radarCtx.fillStyle = '#00ff00';
    radarCtx.beginPath();
    radarCtx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
    radarCtx.fill();

    gameState.enemies.forEach(enemy => {
        radarCtx.fillStyle = enemy.type === 'fast' ? '#ffaa00' : '#ff3333';
        radarCtx.beginPath();
        radarCtx.arc(enemy.x * scale, enemy.y * scale, 2, 0, Math.PI * 2);
        radarCtx.fill();
    });
}

function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 100) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    if (player.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * player.screenShake, (Math.random() - 0.5) * player.screenShake);
        player.screenShake--;
    }

    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x - 10, player.y - 10, 20, 20);

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    const sightLength = 20;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
        player.x + Math.cos(player.angle) * sightLength,
        player.y + Math.sin(player.angle) * sightLength
    );
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 100, player.angle - 0.3, player.angle + 0.3);
    ctx.stroke();

    gameState.enemies.forEach(e => e.draw());
    gameState.projectiles.forEach(p => p.draw());
    gameState.particles.forEach(p => p.draw());
    gameState.explosions.forEach(e => e.draw());
    gameState.powerUps.forEach(p => p.draw());

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function updateUI() {
    document.getElementById('hp').textContent = Math.max(0, Math.floor(player.hp));
    document.getElementById('hpFill').style.width = (player.hp / player.maxHp * 100) + '%';
    document.getElementById('score').textContent = Math.floor(player.score);
    document.getElementById('kills').textContent = player.kills;
    document.getElementById('wave').textContent = gameState.wave;
    document.getElementById('ammo').textContent = player.ammo;
    
    const weapon = weaponConfig[player.weaponIndex];
    document.getElementById('maxAmmo').textContent = weapon.ammoPerClip;
}

function endGame() {
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = Math.floor(player.score);
    document.getElementById('finalKills').textContent = player.kills;
    document.getElementById('finalLevel').textContent = player.level;
    document.getElementById('finalWave').textContent = gameState.wave;
}

function gameLoop() {
    if (!gameState.running && gameState.started) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameState.started && gameState.running) {
        updatePlayer();
        spawnEnemies();
        gameState.enemies.forEach(e => e.update());
        updateProjectiles();
        updateParticles();
        checkPowerUps();
        checkCollisions();
    }

    draw();
    drawRadar();
    updateUI();

    requestAnimationFrame(gameLoop);
}

updateWeaponUI();
gameLoop();

// Player object
const player = {
    x: 600,
    y: 350,
    angle: 0,
    hp: 100,
    maxHp: 100,
    score: 0,
    kills: 0,
    level: 1,
    ammo: 30,
    maxAmmo: 120,
    maxAmmoPerClip: 30,
    speed: 5,
    shootCooldown: 0
};

// Game state
const gameState = {
    running: true,
    enemies: [],
    projectiles: [],
    particles: [],
    spawnTimer: 0,
    difficulty: 1,
    enemyCount: 0,
    maxEnemies: 5 + player.level * 2
};

// Input handling
const keys = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    shoot();
});

// Reload ammo
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    reloadAmmo();
});

// Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 20;
        this.height = 20;
        this.hp = 30 + gameState.difficulty * 10;
        this.maxHp = this.hp;
        this.speed = 2 + gameState.difficulty * 0.5;
        this.shootCooldown = 0;
        this.shootInterval = 100;
    }

    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Move towards player
        if (distance > 50) {
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;
        } else {
            this.vx *= 0.9;
            this.vy *= 0.9;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Keep within bounds
        this.x = Math.max(50, Math.min(canvas.width - 50, this.x));
        this.y = Math.max(50, Math.min(canvas.height - 50, this.y));

        // Shoot cooldown
        this.shootCooldown--;
        if (this.shootCooldown <= 0 && distance < 300) {
            this.enemyShoot();
            this.shootCooldown = this.shootInterval;
        }
    }

    enemyShoot() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const projectile = new Projectile(
            this.x,
            this.y,
            (dx / distance) * 4,
            (dy / distance) * 4,
            15,
            true // isEnemyProjectile
        );
        gameState.projectiles.push(projectile);
    }

    draw() {
        const screenX = this.x;
        const screenY = this.y;

        // Draw enemy
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(screenX - this.width / 2, screenY - this.height / 2, this.width, this.height);

        // Draw health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(screenX - 15, screenY - 30, 30, 5);
        ctx.fillStyle = '#00ff00';
        const healthPercent = this.hp / this.maxHp;
        ctx.fillRect(screenX - 15, screenY - 30, 30 * healthPercent, 5);
    }

    takeDamage(damage) {
        this.hp -= damage;
        return this.hp <= 0;
    }
}

// Projectile class
class Projectile {
    constructor(x, y, vx, vy, damage, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.isEnemy = isEnemy;
        this.radius = 3;
        this.life = 500; // milliseconds
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    isOffScreen() {
        return this.x < -50 || this.x > canvas.width + 50 || 
               this.y < -50 || this.y > canvas.height + 50 || 
               this.life <= 0;
    }

    draw() {
        if (this.isEnemy) {
            ctx.fillStyle = '#ff9900';
        } else {
            ctx.fillStyle = '#00ff00';
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Particle class
class Particle {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = 30;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
        this.life--;
    }

    draw() {
        ctx.globalAlpha = this.life / 30;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Player movement
function updatePlayer() {
    if (keys['w']) player.y -= player.speed;
    if (keys['s']) player.y += player.speed;
    if (keys['a']) player.x -= player.speed;
    if (keys['d']) player.x += player.speed;

    // Keep within bounds
    player.x = Math.max(50, Math.min(canvas.width - 50, player.x));
    player.y = Math.max(50, Math.min(canvas.height - 50, player.y));

    // Calculate angle to mouse
    const dx = mouseX - canvas.width / 2;
    const dy = mouseY - canvas.height / 2;
    player.angle = Math.atan2(dy, dx);

    // Shoot cooldown
    player.shootCooldown--;
}

// Shoot
function shoot() {
    if (player.ammo > 0 && player.shootCooldown <= 0) {
        player.ammo--;
        player.shootCooldown = 15;

        // Create projectile
        const dx = Math.cos(player.angle);
        const dy = Math.sin(player.angle);
        const projectile = new Projectile(
            player.x,
            player.y,
            dx * 8,
            dy * 8,
            25
        );
        gameState.projectiles.push(projectile);

        // Recoil effect
        player.x -= dx * 2;
        player.y -= dy * 2;
    }
}

// Reload ammo
function reloadAmmo() {
    const ammoToAdd = Math.min(player.maxAmmoPerClip - player.ammo, player.maxAmmo - player.ammo);
    player.ammo += ammoToAdd;
}

// Spawn enemies
function spawnEnemies() {
    gameState.spawnTimer++;
    
    if (gameState.enemyCount < gameState.maxEnemies && gameState.spawnTimer > 60 - player.level * 5) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 400;
        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;

        gameState.enemies.push(new Enemy(x, y));
        gameState.enemyCount++;
        gameState.spawnTimer = 0;
    }

    // Spawn more enemies as level increases
    if (gameState.enemyCount === 0 && player.level > 1) {
        gameState.maxEnemies = 5 + player.level * 2;
    }
}

// Update projectiles and check collisions
function updateProjectiles() {
    gameState.projectiles = gameState.projectiles.filter(proj => {
        proj.update();
        return !proj.isOffScreen();
    });

    // Check collisions with enemies
    gameState.projectiles.forEach((proj, projIndex) => {
        if (proj.isEnemy) return;

        gameState.enemies.forEach((enemy, enemyIndex) => {
            const dx = proj.x - enemy.x;
            const dy = proj.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 15) {
                if (enemy.takeDamage(proj.damage)) {
                    // Enemy died
                    player.score += 100 + gameState.difficulty * 10;
                    player.kills++;
                    gameState.enemyCount--;

                    // Level up check
                    if (player.kills % (5 + player.level) === 0) {
                        player.level++;
                        player.maxHp += 10;
                        player.hp = player.maxHp;
                        gameState.difficulty += 0.5;
                    }

                    // Create particles
                    for (let i = 0; i < 10; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 3 + 1;
                        gameState.particles.push(new Particle(
                            enemy.x,
                            enemy.y,
                            Math.cos(angle) * speed,
                            Math.sin(angle) * speed,
                            '#ff3333'
                        ));
                    }

                    gameState.enemies.splice(enemyIndex, 1);
                }
                gameState.projectiles.splice(projIndex, 1);
            }
        });
    });

    // Check collisions with player (enemy projectiles)
    gameState.projectiles.forEach((proj, projIndex) => {
        if (!proj.isEnemy) return;

        const dx = proj.x - player.x;
        const dy = proj.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {
            player.hp -= proj.damage;
            gameState.projectiles.splice(projIndex, 1);

            if (player.hp <= 0) {
                gameState.running = false;
                endGame();
            }
        }
    });
}

// Update particles
function updateParticles() {
    gameState.particles = gameState.particles.filter(p => {
        p.update();
        return p.life > 0;
    });
}

// Check collisions between player and enemies
function checkCollisions() {
    gameState.enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 30) {
            player.hp -= 0.5;
            if (player.hp <= 0) {
                gameState.running = false;
                endGame();
            }
        }
    });
}

// Draw game
function draw() {
    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Draw player
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x - 10, player.y - 10, 20, 20);

    // Draw weapon sight
    const sightLength = 15;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + Math.cos(player.angle) * sightLength, 
               player.y + Math.sin(player.angle) * sightLength);
    ctx.lineTo(player.x + Math.cos(player.angle) * (sightLength + 30), 
               player.y + Math.sin(player.angle) * (sightLength + 30));
    ctx.stroke();

    // Draw enemies
    gameState.enemies.forEach(enemy => {
        enemy.draw();
    });

    // Draw projectiles
    gameState.projectiles.forEach(proj => {
        proj.draw();
    });

    // Draw particles
    gameState.particles.forEach(p => {
        p.draw();
    });
}

// Update UI
function updateUI() {
    document.getElementById('hp').textContent = Math.max(0, Math.floor(player.hp));
    document.getElementById('score').textContent = Math.floor(player.score);
    document.getElementById('kills').textContent = player.kills;
    document.getElementById('level').textContent = player.level;
    document.getElementById('ammo').textContent = player.ammo;
    document.getElementById('maxAmmo').textContent = player.maxAmmo;
}

// End game
function endGame() {
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = Math.floor(player.score);
    document.getElementById('finalKills').textContent = player.kills;
    document.getElementById('finalLevel').textContent = player.level;
}

// Game loop
function gameLoop() {
    if (!gameState.running) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Update
    updatePlayer();
    spawnEnemies();
    
    gameState.enemies.forEach(enemy => {
        enemy.update();
    });

    updateProjectiles();
    updateParticles();
    checkCollisions();

    // Draw
    draw();
    updateUI();

    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
