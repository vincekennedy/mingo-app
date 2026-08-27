const user_message = process.argv[2] || 'Blocked.'
const agent_message = process.argv[3] || user_message
process.stdout.write(
  `${JSON.stringify({ permission: 'deny', user_message, agent_message })}\n`,
)
