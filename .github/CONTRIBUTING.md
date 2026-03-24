# Contributing to WeComProxy

Thank you for your interest in contributing to WeComProxy!

## Development Environment

This project was developed with the assistance of Claude Code (Claude Opus 4.6), an AI coding assistant that helped design the architecture, implement features, and create documentation.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/WeComProxy.git`
3. Install dependencies: `npm install`
4. Run in development mode: `npm run dev`

## Making Changes

- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Test your changes thoroughly

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit with descriptive messages
3. Push to your fork: `git push origin feature/your-feature`
4. Create a Pull Request

## Docker Development

- Build image: `npm run docker:build`
- Run container: `npm run docker:run`
- Full deployment: `npm run docker:deploy`

## Release Process

Use the provided release scripts for version management:
- Windows: `scripts\release.bat 1.0.1`
- Unix: `scripts/release.sh 1.0.1`

## Questions?

Feel free to open an issue for any questions or suggestions!