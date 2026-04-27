const pool = {
  query: jest.fn().mockResolvedValue([[], {}]),
  getConnection: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue([[], {}]),
    release: jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
  }),
  end: jest.fn().mockResolvedValue(),
};

module.exports = pool;
