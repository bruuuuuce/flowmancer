# Contributing to Flowmancer

First off, thank you for considering contributing to Flowmancer! It's people like you that make Flowmancer such a powerful tool for mastering distributed system flows.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if possible**
- **Note your environment** (OS, browser, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Describe the current behavior and explain the expected behavior**
- **Explain why this enhancement would be useful**

### Your First Code Contribution

Unsure where to begin? You can start by looking through these issues:

- Issues labeled `good first issue` - simple issues perfect for beginners
- Issues labeled `help wanted` - issues where we need help
- Issues labeled `refactoring` - help us improve code quality

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes (`npm run test:run`)
5. Make sure your code follows the existing style
6. Issue that pull request!

## Development Setup

1. Fork and clone the repository
```bash
git clone https://github.com/yourusername/flowmancer.git
cd flowmancer
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Make your changes and test them
```bash
npm run test
```

## Project Structure

```
src/
├── ui/                    # Vue components
│   ├── App.vue           # Main app (needs refactoring!)
│   └── components/       # Reusable components
├── metrics/              # Metrics calculation system
├── composables/          # Vue composition utilities
├── scripting/            # Script interpreter
└── parsers/              # File format parsers
```

## Style Guide

### Git Commit Messages

- Use the present tense with third person ("Adds feature" not "Added feature")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Style

- Use TypeScript for all new code
- Define interfaces for complex types
- Avoid `any` type when possible
- Use meaningful variable names

### Vue Style

- Use Composition API for new components
- Use `<script setup>` syntax
- Keep components focused and small
- Extract reusable logic into composables

## Testing

- Write tests for new features
- Update tests when modifying existing features
- Run tests before submitting PR: `npm run test:run`
- Aim for good test coverage

## Areas Needing Help

### High Priority
1. **Refactoring App.vue** - It's 1960 lines! Help us split it into smaller components
2. **Refactoring StatsOverlayEnhanced.vue** - 1472 lines that need splitting
3. **Test Coverage** - Increase coverage and fix failing tests
4. **Documentation** - Add JSDoc comments and improve guides

### Features Welcome
- New node types (Redis, Kafka, etc.)
- Export functionality (CSV, JSON)
- Performance improvements
- UI/UX enhancements
- Chaos engineering features

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## Recognition

Contributors will be recognized in our README. Thank you for your contribution!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
