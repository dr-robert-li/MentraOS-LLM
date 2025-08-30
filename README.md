# MentraOS LLM 
### Version: 0.5.1

AI-powered virtual assistant for Mentra smart glasses, deployable to Google Cloud Run and other Node.js platforms.

**Author:** Dr. Robert Li

## What This Does

Brings your own LLM provider to MentraOS smart glasses for enhanced privacy and control. Supports wake word detection, voice processing, location awareness, notification handling, and multimodal AI interactions through OpenAI, Anthropic, Google, and Perplexity providers.

**Note:** This application was designed specifically with the Even Realities G1 glasses in mind, using Android. It has not been tested on other smart glasses or systems.

## Prerequisites

- Node.js 18+ (or Bun runtime)
- Google Cloud account (for deployment)
- API keys for your preferred LLM providers
- LocationIQ token (optional, for location services)

## Development Setup

```bash
# Install dependencies
bun install
# or
npm install

# Copy configuration templates
cp cloudrun.yaml.example cloudrun.yaml
cp app-config.example.json your-developer-id.mentraos.app-name_config.json

# Start development server
npm run dev
# or
bun run dev

# Build for production
npm run build
```

## Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

See [.env.example](.env.example) for all available configuration options including API keys settings, provider settings, and optional services.

## Deployment

### Google Cloud Run (Recommended)

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Update app configuration
cp app-config.example.json your-developer-id.mentraos.app-name_config.json
# Edit the config file with your specific app details

# Deploy directly from source
npm run deploy:gcloud

# Or build and deploy container
npm run deploy:gcloud:build

# After deployment, submit your app to the Mentra Glass Developer Console
# Visit: https://console.mentra.glass/apps
```

### Other Platforms

This Node.js application can be deployed to AWS ECS/Fargate, Azure Container Apps, Heroku, Railway, Render, or Fly.io.

## Security

- Environment variables for API key storage
- Request validation and sanitization
- Google Cloud IAM integration
- No sensitive data logged or transmitted
- Automatic HTTPS on Google Cloud Run

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the [TROUBLESHOOTING](TROUBLESHOOTING.md) guide
- Review Google Cloud Run documentation

## Troubleshooting

See [TROUBLESHOOTING](TROUBLESHOOTING.md) for detailed troubleshooting steps and solutions to common issues.

## Acknowledgements

- This is a fork of the MentraOS [Mira](https://github.com/Mentra-Community/Mira) project - thank you to the original makers and the Mentra-Community for their foundational work
- Built with the MentraOS SDK, migrated from original AugmentOS SDK
- Supports multiple LLM providers for maximum flexibility
- Optimized for smart glasses constraints and performance

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

See [CHANGELOG](CHANGELOG) for detailed version history and release notes.