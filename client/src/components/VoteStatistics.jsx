import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const COLORS = ['#be185d', '#1d4ed8']

export default function VoteStatistics({ statistics, loading }) {
  if (loading) {
    return (
      <div className="card statistics-section">
        <h3 className="statistics-title">📊 数据统计</h3>
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          加载统计数据中...
        </div>
      </div>
    )
  }

  if (!statistics) {
    return null
  }

  const { dailyTrend, totalVoters, votesA, votesB, totalVotes, percentA, percentB, optionA, optionB } = statistics

  const pieData = [
    { name: optionA, value: votesA, side: 'A' },
    { name: optionB, value: votesB, side: 'B' }
  ]

  const hasTrendData = dailyTrend && dailyTrend.some(d => d.A > 0 || d.B > 0)

  return (
    <div className="card statistics-section">
      <h3 className="statistics-title">📊 数据统计</h3>

      <div className="statistics-overview">
        <div className="stat-card">
          <div className="stat-value">{totalVotes}</div>
          <div className="stat-label">总投票数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalVoters}</div>
          <div className="stat-label">参与人数</div>
        </div>
        <div className="stat-card stat-a">
          <div className="stat-value">{votesA}</div>
          <div className="stat-label">{optionA}</div>
        </div>
        <div className="stat-card stat-b">
          <div className="stat-value">{votesB}</div>
          <div className="stat-label">{optionB}</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-box">
          <h4 className="chart-title">每日新增票数趋势</h4>
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 13
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line
                  type="monotone"
                  dataKey="A"
                  name={optionA}
                  stroke="#be185d"
                  strokeWidth={2.5}
                  dot={{ fill: '#be185d', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="B"
                  name={optionB}
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={{ fill: '#1d4ed8', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">暂无趋势数据</div>
          )}
        </div>

        <div className="chart-box">
          <h4 className="chart-title">双方支持率</h4>
          {totalVotes > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.slice(0, 4)}${name.length > 4 ? '...' : ''} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={90}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  fontSize={12}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} 票`, name]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 13
                  }}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 13 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">暂无投票数据</div>
          )}
        </div>
      </div>

      <div className="support-rate-bar">
        <div
          className="support-rate-a"
          style={{ width: `${percentA}%` }}
        >
          {percentA > 10 && `${percentA.toFixed(1)}%`}
        </div>
        <div
          className="support-rate-b"
          style={{ width: `${percentB}%` }}
        >
          {percentB > 10 && `${percentB.toFixed(1)}%`}
        </div>
      </div>
      <div className="support-rate-labels">
        <span style={{ color: '#be185d' }}>{optionA}</span>
        <span style={{ color: '#1d4ed8' }}>{optionB}</span>
      </div>
    </div>
  )
}
