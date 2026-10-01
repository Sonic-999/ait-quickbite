import db from '../db.js';

/**
 * Calculates current streak multiplier and descriptive message
 */
export function getStreakMultiplier(streakDays) {
  const days = Math.max(1, Number(streakDays) || 1);
  if (days >= 7) {
    return {
      multiplier: 3.0,
      streakMessage: `${days}-Day Campus Legend Streak! 3x Points`,
      tier: 'Legendary',
    };
  }
  if (days >= 5) {
    return {
      multiplier: 2.5,
      streakMessage: `${days}-Day Campus Streak! 2.5x Points`,
      tier: 'Master',
    };
  }
  if (days >= 3) {
    return {
      multiplier: 2.0,
      streakMessage: `${days}-Day Coffee Streak! 2x Points`,
      tier: 'Pro',
    };
  }
  if (days >= 2) {
    return {
      multiplier: 1.5,
      streakMessage: `${days}-Day Snack Streak! 1.5x Points`,
      tier: 'Rising',
    };
  }
  return {
    multiplier: 1.0,
    streakMessage: '1-Day Streak! 1x Points (Order tomorrow for 1.5x streak multiplier)',
    tier: 'Bronze',
  };
}

/**
 * Credits BiteCoins points to user account based on spend & consecutive day streak
 * Rule: ₹1 spent = 1 base point * streak multiplier
 */
export function creditUserBitecoins(userId, orderTotal, orderDateStr = null) {
  const targetUserId = (!userId || userId.startsWith('user_')) ? 'usr-std-01' : userId;

  // 1. Fetch user record
  let user = db.prepare('SELECT id, name, bitecoins_balance, current_streak, last_order_date FROM Users WHERE id = ?').get(targetUserId);
  if (!user) {
    user = { id: targetUserId, name: 'Aarav Sharma', bitecoins_balance: 520, current_streak: 3, last_order_date: '2026-09-30' };
  }

  const todayStr = orderDateStr ? orderDateStr.substring(0, 10) : new Date().toISOString().substring(0, 10);
  const lastOrderDate = user.last_order_date ? user.last_order_date.substring(0, 10) : null;

  let newStreak = user.current_streak || 1;

  if (lastOrderDate) {
    const dLast = new Date(lastOrderDate + 'T00:00:00Z');
    const dToday = new Date(todayStr + 'T00:00:00Z');
    const diffDays = Math.round((dToday - dLast) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays === 0) {
      newStreak = Math.max(1, newStreak);
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const { multiplier, streakMessage, tier } = getStreakMultiplier(newStreak);

  // Base points: ₹1 spent = 1 base point
  const basePoints = Math.max(1, Math.round(Number(orderTotal) || 0));
  const earnedPoints = Math.round(basePoints * multiplier);
  const newBalance = (user.bitecoins_balance || 0) + earnedPoints;

  // Persist updated balance and streak in Users table
  db.prepare(`
    UPDATE Users
    SET bitecoins_balance = ?, current_streak = ?, last_order_date = ?
    WHERE id = ?
  `).run(newBalance, newStreak, todayStr, targetUserId);

  return {
    userId: targetUserId,
    basePoints,
    multiplier,
    earnedPoints,
    newBalance,
    currentStreak: newStreak,
    streakMessage,
    tier,
  };
}

/**
 * Fetch available low-cost redeemable reward items
 */
export function getRedeemableRewards() {
  return [
    {
      id: 'reward-tea',
      itemId: 'jc-tea-special',
      name: 'AIT Special Cutting Chai',
      category: 'Beverages',
      shopName: 'Juice Center',
      price: 15,
      pointsRequired: 500,
      description: '100% FREE hot aromatic Indian cutting tea with cardamom & ginger.',
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop',
      badge: 'Popular Perk',
    },
    {
      id: 'reward-patty',
      itemId: 'jc-sn-patty',
      name: 'Crispy Golden Veg Patty',
      category: 'Snacks',
      shopName: 'Juice Center',
      price: 20,
      pointsRequired: 500,
      description: '100% FREE golden flaky puff pastry with spiced potato-pea filling.',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
      badge: 'Student Bestseller',
    },
    {
      id: 'reward-samosa-pav',
      itemId: 'jc-sn-samosa-pav',
      name: 'Mumbai Samosa Pav',
      category: 'Snacks',
      shopName: 'Juice Center',
      price: 25,
      pointsRequired: 500,
      description: '100% FREE warm pav bun with crispy Punjabi samosa & garlic chutney.',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
      badge: 'Campus Favorite',
    },
  ];
}

/**
 * Redeem 500 BiteCoins for a 100% discount promo code
 */
export function redeemBitecoinsReward(userId, rewardId) {
  const targetUserId = (!userId || userId.startsWith('user_')) ? 'usr-std-01' : userId;

  let user = db.prepare('SELECT id, name, bitecoins_balance, current_streak FROM Users WHERE id = ?').get(targetUserId);
  if (!user) {
    user = { id: targetUserId, name: 'Aarav Sharma', bitecoins_balance: 520, current_streak: 3 };
  }

  const currentBalance = user.bitecoins_balance || 0;
  if (currentBalance < 500) {
    throw new Error(`Insufficient BiteCoins. You have ${currentBalance} points, but need 500 points to redeem a free item.`);
  }

  const rewards = getRedeemableRewards();
  const reward = rewards.find((r) => r.id === rewardId || r.itemId === rewardId) || rewards[0];

  const newBalance = currentBalance - 500;
  const promoCode = `BITE-${reward.category === 'Beverages' ? 'CHAI' : 'PATTY'}-${Math.floor(1000 + Math.random() * 9000)}`;
  const promoId = 'promo-' + Date.now();

  // Deduct balance in Users
  db.prepare('UPDATE Users SET bitecoins_balance = ? WHERE id = ?').run(newBalance, targetUserId);

  // Store promo code in PromoCodes table
  db.prepare(`
    INSERT INTO PromoCodes (
      id, code, user_id, item_id, item_name, item_price, discount_percent, is_redeemed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    promoId,
    promoCode,
    targetUserId,
    reward.itemId,
    reward.name,
    reward.price,
    100
  );

  return {
    success: true,
    promoCode,
    promoId,
    freeItem: {
      id: reward.itemId,
      name: reward.name,
      price: reward.price,
      shopName: reward.shopName,
      category: reward.category,
      image: reward.image,
    },
    deductedPoints: 500,
    newBalance,
    message: `100% Discount code ${promoCode} generated for free ${reward.name}! Automatically applied to your next cart.`,
  };
}

/**
 * Fetch user rewards status and active promo codes
 */
export function getUserRewardsStatus(userId) {
  const targetUserId = (!userId || userId.startsWith('user_')) ? 'usr-std-01' : userId;

  let user = db.prepare('SELECT id, name, bitecoins_balance, current_streak, last_order_date FROM Users WHERE id = ?').get(targetUserId);
  if (!user) {
    user = { id: targetUserId, name: 'Aarav Sharma', bitecoins_balance: 520, current_streak: 3, last_order_date: '2026-09-30' };
  }

  const balance = user.bitecoins_balance || 0;
  const streak = user.current_streak || 1;
  const { multiplier, streakMessage, tier } = getStreakMultiplier(streak);

  // Fetch unredeemed promo codes
  const activePromoCodes = db.prepare(`
    SELECT id, code, item_id, item_name, item_price, discount_percent, created_at
    FROM PromoCodes
    WHERE user_id = ? AND is_redeemed = 0
    ORDER BY created_at DESC
  `).all(targetUserId);

  const availableRewards = getRedeemableRewards();

  return {
    success: true,
    userId: targetUserId,
    userName: user.name || 'Aarav Sharma',
    bitecoinsBalance: balance,
    currentStreak: streak,
    multiplier,
    streakMessage,
    tier,
    canRedeem: balance >= 500,
    pointsToNextReward: Math.max(0, 500 - (balance % 500)),
    availableRewards,
    activePromoCodes,
  };
}
