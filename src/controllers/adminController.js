import User from '../models/User.js';
import Room from '../models/Room.js';
import Transaction from '../models/Transaction.js';
import Admin from '../models/Admin.js';
import WinnerRequest from '../models/WinnerRequest.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Admin Authentication
export const adminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Find admin
  const admin = await Admin.findOne({ username, isActive: true });
  if (!admin) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check if account is locked
  if (admin.isLocked) {
    throw new ApiError(401, 'Account is temporarily locked due to too many failed login attempts');
  }

  // Verify password
  const isPasswordValid = await admin.comparePassword(password);
  if (!isPasswordValid) {
    await admin.incLoginAttempts();
    throw new ApiError(401, 'Invalid credentials');
  }

  // Reset login attempts on successful login
  await admin.resetLoginAttempts();

  // Update last login
  admin.lastLogin = new Date();
  await admin.save();

  // Generate JWT token
  const token = jwt.sign(
    { adminId: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json(new ApiResponse(200, {
    admin: admin.toJSON(),
    token
  }, 'Login successful'));
});

export const adminLogout = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const changeAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.admin._id;

  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  // Update password
  admin.password = newPassword;
  await admin.save();

  res.json(new ApiResponse(200, null, 'Password changed successfully'));
});

// Dashboard & Analytics
export const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    totalRooms,
    activeRooms,
    completedRooms,
    pendingWinnerRequests,
    todayStats,
    recentUsers,
    topWinners
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    Room.countDocuments(),
    Room.countDocuments({ status: { $in: ['waiting', 'playing'] } }),
    Room.countDocuments({ status: 'completed' }),
    WinnerRequest.countDocuments({ status: 'pending' }),
    Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]),
    User.find().sort({ createdAt: -1 }).limit(5).select('name phone balance createdAt'),
    User.find({ totalWins: { $gt: 0 } })
      .sort({ totalWinnings: -1 })
      .limit(5)
      .select('name totalWins totalWinnings')
  ]);

  // Calculate total revenue (platform fees)
  const totalRevenue = await Transaction.aggregate([
    {
      $match: {
        type: 'platform_fee',
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Process today's stats
  const todayStatsObj = {
    deposits: 0,
    withdrawals: 0,
    gameRevenue: 0
  };

  todayStats.forEach(stat => {
    switch (stat._id) {
      case 'deposit':
        todayStatsObj.deposits = stat.total;
        break;
      case 'withdrawal':
        todayStatsObj.withdrawals = stat.total;
        break;
      case 'platform_fee':
        todayStatsObj.gameRevenue = stat.total;
        break;
    }
  });

  const stats = {
    overview: {
      totalUsers,
      activeUsers,
      totalRooms,
      activeRooms,
      completedRooms,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingWinnerRequests
    },
    periodStats: {
      today: todayStatsObj
    },
    recentActivity: {
      users: recentUsers
    },
    topWinners
  };

  res.json(new ApiResponse(200, stats, 'Dashboard stats retrieved successfully'));
});

export const getSystemStats = asyncHandler(async (req, res) => {
  const stats = {
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    },
    database: {
      collections: {
        users: await User.countDocuments(),
        rooms: await Room.countDocuments(),
        transactions: await Transaction.countDocuments(),
        admins: await Admin.countDocuments()
      }
    }
  };

  res.json(new ApiResponse(200, stats, 'System stats retrieved successfully'));
});

export const getRevenueStats = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  
  let startDate = new Date();
  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  const endDate = new Date();

  // Get revenue stats
  const [revenueData, transactionStats, chartData] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 }
        }
      }
    ]),
    Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]),
    Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          dailyData: {
            $push: {
              date: '$_id.date',
              amount: '$amount',
              count: '$count'
            }
          }
        }
      }
    ])
  ]);

  // Calculate platform revenue and total games
  const platformFee = revenueData.find(r => r._id === 'platform_fee')?.totalAmount || 0;
  const totalGames = await Room.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    status: 'completed'
  });
  const totalPrizePool = revenueData.find(r => r._id === 'game_win')?.totalAmount || 0;

  // Process transaction stats
  const transactions = {};
  transactionStats.forEach(stat => {
    transactions[stat._id] = {
      totalAmount: stat.totalAmount,
      totalCount: stat.totalCount,
      averageAmount: stat.averageAmount
    };
  });

  // Process chart data
  const chartDataObj = {};
  chartData.forEach(data => {
    chartDataObj[data._id] = data.dailyData;
  });

  const stats = {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    revenue: {
      platformFee,
      totalGames,
      totalPrizePool
    },
    transactions,
    chartData: chartDataObj
  };

  res.json(new ApiResponse(200, stats, 'Revenue stats retrieved successfully'));
});

// User Management
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    status = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Build query
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  if (status !== 'all') {
    query.isActive = status === 'active';
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('name phone balance totalGames totalWins totalWinnings isActive createdAt')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    User.countDocuments(query)
  ]);

  // Calculate win rates
  const usersWithWinRate = users.map(user => ({
    ...user,
    winRate: user.totalGames > 0 ? Math.round((user.totalWins / user.totalGames) * 100) : 0,
    recentTransactions: 0, // This would need a separate query if needed
    activeRooms: 0 // This would need a separate query if needed
  }));

  res.json(new ApiResponse(200, {
    data: usersWithWinRate,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  }, 'Users retrieved successfully'));
});

export const getUserDetails = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Get user's recent transactions
  const recentTransactions = await Transaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('room', 'roomId gameType amount');

  // Get user's recent rooms
  const recentRooms = await Room.find({
    $or: [
      { createdBy: userId },
      { 'players.userId': userId }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('roomId gameType amount status createdAt completedAt winner');

  const userDetails = {
    ...user.toJSON(),
    recentTransactions,
    recentRooms,
    winRate: user.totalGames > 0 ? Math.round((user.totalWins / user.totalGames) * 100) : 0
  };

  res.json(new ApiResponse(200, userDetails, 'User details retrieved successfully'));
});

export const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(400, 'User is already blocked');
  }

  user.isActive = false;
  user.blockReason = reason || 'Blocked by admin';
  user.blockedAt = new Date();
  user.blockedBy = req.admin._id;
  await user.save();

  res.json(new ApiResponse(200, null, 'User blocked successfully'));
});

export const unblockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isActive) {
    throw new ApiError(400, 'User is not blocked');
  }

  user.isActive = true;
  user.blockReason = undefined;
  user.blockedAt = undefined;
  user.blockedBy = undefined;
  await user.save();

  res.json(new ApiResponse(200, null, 'User unblocked successfully'));
});

export const updateUserBalance = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { amount, type, reason } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new ApiError(400, 'Amount must be a positive number');
  }

  // Calculate new balance
  let newBalance;
  if (type === 'add') {
    newBalance = user.balance + numericAmount;
  } else if (type === 'deduct') {
    if (user.balance < numericAmount) {
      throw new ApiError(400, 'Insufficient balance to deduct');
    }
    newBalance = user.balance - numericAmount;
  } else {
    throw new ApiError(400, 'Invalid type. Must be "add" or "deduct"');
  }

  // Update user balance
  const oldBalance = user.balance;
  user.balance = newBalance;
  await user.save();

  // Create transaction record
  const transaction = new Transaction({
    user: userId,
    type: type === 'add' ? 'admin_credit' : 'admin_debit',
    amount: numericAmount,
    status: 'completed',
    description: reason,
    balanceBefore: oldBalance,
    balanceAfter: newBalance,
    processedBy: req.admin._id,
    metadata: {
      adminAction: true,
      adminId: req.admin._id,
      adminUsername: req.admin.username
    }
  });

  await transaction.save();

  res.json(new ApiResponse(200, {
    user: {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      oldBalance,
      newBalance,
      amountChanged: numericAmount,
      type
    },
    transaction: transaction.toJSON()
  }, `User balance ${type === 'add' ? 'credited' : 'debited'} successfully`));
});

export const getUserActivity = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const [transactions, rooms, total] = await Promise.all([
    Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('room', 'roomId gameType amount'),
    Room.find({
      $or: [
        { createdBy: userId },
        { 'players.userId': userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('roomId gameType amount status createdAt completedAt winner'),
    Transaction.countDocuments({ user: userId })
  ]);

  res.json(new ApiResponse(200, {
    user: user.toJSON(),
    transactions,
    rooms,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  }, 'User activity retrieved successfully'));
});

// Room Management
export const getAllRooms = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status = 'all',
    gameType = 'all',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Build query
  const query = {};
  if (status !== 'all') {
    query.status = status;
  }
  if (gameType !== 'all') {
    query.gameType = gameType;
  }
  if (search) {
    query.roomId = { $regex: search, $options: 'i' };
  }

  const [rooms, total] = await Promise.all([
    Room.find(query)
      .populate('createdBy', 'name phone')
      .populate('players.userId', 'name phone')
      .populate('winner', 'name phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Room.countDocuments(query)
  ]);

  res.json(new ApiResponse(200, {
    data: rooms,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  }, 'Rooms retrieved successfully'));
});

export const getRoomDetails = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findOne({ roomId })
    .populate('createdBy', 'name phone')
    .populate('players.userId', 'name phone balance')
    .populate('winner', 'name phone');

  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  // Get room transactions
  const transactions = await Transaction.find({ room: room._id })
    .populate('user', 'name phone')
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, {
    room,
    transactions
  }, 'Room details retrieved successfully'));
});

export const declareCorrectWinner = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { winnerId, reason } = req.body;

  const room = await Room.findOne({ roomId });
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  if (room.status !== 'completed') {
    throw new ApiError(400, 'Can only declare winner for completed rooms');
  }

  const winner = await User.findById(winnerId);
  if (!winner) {
    throw new ApiError(404, 'Winner not found');
  }

  // Check if winner was a player in the room
  const isPlayerInRoom = room.players.some(player => 
    player.userId.toString() === winnerId
  );
  if (!isPlayerInRoom) {
    throw new ApiError(400, 'Winner must be a player in the room');
  }

  // Update room with correct winner
  room.winner = winnerId;
  room.adminDeclaredWinner = true;
  room.adminNotes = reason;
  room.processedBy = req.admin._id;
  await room.save();

  // If there was a previous winner, reverse their winnings
  if (room.winner && room.winner.toString() !== winnerId) {
    const previousWinner = await User.findById(room.winner);
    if (previousWinner) {
      previousWinner.balance -= room.winnerAmount;
      previousWinner.totalWinnings -= room.winnerAmount;
      previousWinner.totalWins -= 1;
      await previousWinner.save();

      // Create reversal transaction
      await Transaction.create({
        user: room.winner,
        room: room._id,
        type: 'admin_reversal',
        amount: -room.winnerAmount,
        status: 'completed',
        description: `Winner declaration reversed by admin: ${reason}`,
        processedBy: req.admin._id
      });
    }
  }

  // Credit the correct winner
  winner.balance += room.winnerAmount;
  winner.totalWinnings += room.winnerAmount;
  winner.totalWins += 1;
  await winner.save();

  // Create winning transaction
  await Transaction.create({
    user: winnerId,
    room: room._id,
    type: 'game_win',
    amount: room.winnerAmount,
    status: 'completed',
    description: `Correct winner declared by admin: ${reason}`,
    processedBy: req.admin._id
  });

  res.json(new ApiResponse(200, null, 'Correct winner declared successfully'));
});

export const cancelRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { reason } = req.body;

  const room = await Room.findOne({ roomId });
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  if (room.status === 'cancelled') {
    throw new ApiError(400, 'Room is already cancelled');
  }

  if (room.status === 'completed') {
    throw new ApiError(400, 'Cannot cancel completed room');
  }

  // Refund all players
  for (const player of room.players) {
    const user = await User.findById(player.userId);
    if (user) {
      user.balance += room.amount;
      await user.save();

      // Create refund transaction
      await Transaction.create({
        user: player.userId,
        room: room._id,
        type: 'refund',
        amount: room.amount,
        status: 'completed',
        description: `Room cancelled by admin: ${reason}`,
        processedBy: req.admin._id
      });
    }
  }

  // Update room status
  room.status = 'cancelled';
  room.cancelReason = reason;
  room.cancelledBy = req.admin._id;
  room.cancelledAt = new Date();
  await room.save();

  res.json(new ApiResponse(200, null, 'Room cancelled and players refunded successfully'));
});

// Transaction Management
export const getAllTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type = 'all',
    status = 'all',
    userId,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Build query
  const query = {};
  if (type !== 'all') {
    query.type = type;
  }
  if (status !== 'all') {
    query.status = status;
  }
  if (userId) {
    query.user = userId;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .populate('user', 'name phone')
      .populate('room', 'roomId gameType amount')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Transaction.countDocuments(query)
  ]);

  res.json(new ApiResponse(200, {
    data: transactions,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  }, 'Transactions retrieved successfully'));
});

export const getTransactionDetails = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  const transaction = await Transaction.findById(transactionId)
    .populate('user', 'name phone balance')
    .populate('room', 'roomId gameType amount status')
    .populate('processedBy', 'username');

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  res.json(new ApiResponse(200, transaction, 'Transaction details retrieved successfully'));
});

export const processRefund = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { reason } = req.body;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  if (transaction.status !== 'completed') {
    throw new ApiError(400, 'Can only refund completed transactions');
  }

  if (transaction.type === 'refund') {
    throw new ApiError(400, 'Cannot refund a refund transaction');
  }

  const user = await User.findById(transaction.user);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Create refund transaction
  const refundTransaction = new Transaction({
    user: transaction.user,
    room: transaction.room,
    type: 'refund',
    amount: transaction.amount,
    status: 'completed',
    description: `Refund for transaction ${transaction._id}: ${reason}`,
    processedBy: req.admin._id,
    relatedTransaction: transaction._id
  });

  // Update user balance
  user.balance += transaction.amount;
  await user.save();

  // Mark original transaction as refunded
  transaction.isRefunded = true;
  transaction.refundedAt = new Date();
  transaction.refundedBy = req.admin._id;
  transaction.refundReason = reason;

  await Promise.all([
    refundTransaction.save(),
    transaction.save()
  ]);

  res.json(new ApiResponse(200, {
    originalTransaction: transaction,
    refundTransaction
  }, 'Refund processed successfully'));
});

// Data Export
export const exportData = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { startDate, endDate } = req.query;

  const dateQuery = {};
  if (startDate || endDate) {
    dateQuery.createdAt = {};
    if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
    if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
  }

  let data;
  switch (type) {
    case 'users':
      data = await User.find(dateQuery)
        .select('name phone balance totalGames totalWins totalWinnings isActive createdAt')
        .lean();
      break;
    case 'transactions':
      data = await Transaction.find(dateQuery)
        .populate('user', 'name phone')
        .populate('room', 'roomId gameType')
        .lean();
      break;
    case 'rooms':
      data = await Room.find(dateQuery)
        .populate('createdBy', 'name phone')
        .populate('winner', 'name phone')
        .lean();
      break;
    default:
      throw new ApiError(400, 'Invalid export type');
  }

  res.json(new ApiResponse(200, data, `${type} data exported successfully`));
});

// Winner Verification Management
export const getWinnerRequests = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status = 'all',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Build query
  const query = {};
  if (status !== 'all') {
    query.status = status;
  }
  if (search) {
    query.roomId = { $regex: search, $options: 'i' };
  }

  const [requests, total] = await Promise.all([
    WinnerRequest.find(query)
      .populate('gameRoomId', 'roomId gameType amount players createdAt startedAt')
      .populate('declaredBy', 'name phone')
      .populate('declaredWinner', 'name phone')
      .populate('processedBy', 'username')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    WinnerRequest.countDocuments(query)
  ]);

  res.json(new ApiResponse(200, {
    data: requests,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  }, 'Winner requests retrieved successfully'));
});

export const getWinnerRequestDetails = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const request = await WinnerRequest.findById(requestId)
    .populate({
      path: 'gameRoomId',
      populate: {
        path: 'players.userId',
        select: 'name phone'
      }
    })
    .populate('declaredBy', 'name phone')
    .populate('declaredWinner', 'name phone')
    .populate('processedBy', 'username');

  if (!request) {
    throw new ApiError(404, 'Winner request not found');
  }

  // Get room transactions
  const roomTransactions = await Transaction.find({ room: request.gameRoomId._id })
    .populate('user', 'name phone')
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, {
    request,
    roomTransactions
  }, 'Winner request details retrieved successfully'));
});

export const approveWinnerRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { notes } = req.body;

  const request = await WinnerRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Winner request not found');
  }

  if (request.status !== 'pending') {
    throw new ApiError(400, 'Request has already been processed');
  }

  const room = await Room.findById(request.gameRoomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  const winner = await User.findById(request.declaredWinner);
  if (!winner) {
    throw new ApiError(404, 'Winner not found');
  }

  // Update request status
  request.status = 'approved';
  request.adminNotes = notes;
  request.processedBy = req.admin._id;
  request.processedAt = new Date();
  await request.save();

  // Update room status to completed
  room.status = 'completed';
  room.winner = request.declaredWinner;
  room.winnerAmount = request.winnerAmount;
  room.completedAt = new Date();
  await room.save();

  // Credit winner
  winner.balance += request.winnerAmount;
  winner.totalWinnings += request.winnerAmount;
  winner.totalWins += 1;
  await winner.save();

  // Create winning transaction
  await Transaction.create({
    user: request.declaredWinner,
    room: room._id,
    type: 'game_win',
    amount: request.winnerAmount,
    status: 'completed',
    description: `Game win - Room ${room.roomId}`,
    balanceBefore: winner.balance - request.winnerAmount,
    balanceAfter: winner.balance
  });

  res.json(new ApiResponse(200, null, 'Winner request approved successfully'));
});

export const rejectWinnerRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;

  const request = await WinnerRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Winner request not found');
  }

  if (request.status !== 'pending') {
    throw new ApiError(400, 'Request has already been processed');
  }

  const room = await Room.findById(request.gameRoomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  // Update request status
  request.status = 'rejected';
  request.adminNotes = reason;
  request.processedBy = req.admin._id;
  request.processedAt = new Date();
  await request.save();

  // Reset room status to playing
  room.status = 'playing';
  room.winner = undefined;
  room.winnerAmount = undefined;
  await room.save();

  res.json(new ApiResponse(200, null, 'Winner request rejected successfully'));
});