# LangChain Learning Repository

This repository contains code examples and implementations following the [LangChain JS/TS tutorials](https://js.langchain.com/docs/tutorials/).

## What is LangChain?

LangChain is a framework for developing applications powered by language models. It enables the creation of applications that are:

- **Context-aware**: Connect language models to sources of data
- **Reasoning**: Use language models to make decisions and take actions

## Purpose

This repository serves as a learning playground for exploring LangChain's capabilities. It includes implementations of various tutorials and examples from the official documentation, allowing for hands-on experience with:

- Building conversational agents
- Creating chains and sequences
- Implementing retrieval-augmented generation (RAG)
- Working with various language models
- Utilizing vector stores and embedding techniques

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2.4 or later

### Installation

To install dependencies:

```bash
bun install
```

### Running Examples

To run the default example:

```bash
bun run index.ts
```

For specific examples:

```bash
bun run examples/<example-name>.ts
```

## Project Structure

- `examples/` - Individual tutorial implementations
- `src/` - Shared components and utilities
- `data/` - Sample data used by examples

## Tutorial Implementations

This repository follows tutorials from the [LangChain documentation](https://js.langchain.com/docs/tutorials/), including:

- Chat models and chat prompts
- Building conversational agents
- Retrieval-augmented generation
- Working with structured outputs
- Memory and state management

## Featured Projects

### Crypto Contract Analysis Supervisor

The repository includes an advanced implementation of a multi-agent system for comprehensive crypto contract analysis:

- **Architecture**: Uses LangGraph's supervisor pattern to coordinate specialized agents
- **Workflow**:

  1. Data collection from multiple sources (social, market, on-chain)
  2. Multi-faceted analysis through specialized agents
  3. Opportunity evaluation based on combined insights
  4. Detailed report generation

- **Key Components**:
  - **Data Fetcher Agent**: Retrieves data from Farcaster, Coingecko, and Etherscan
  - **Analysis Agents**: Separate agents for social, market, and on-chain analysis
  - **Evaluation Agent**: Assesses investment opportunity based on all analyses
  - **Report Generation Agent**: Creates comprehensive markdown reports

To run the contract analysis:

```bash
bun run tests/onchain-supervisor/run_contract_analysis.ts
```

## Resources

- [LangChain Documentation](https://js.langchain.com/docs/)
- [LangChain GitHub Repository](https://github.com/langchain-ai/langchainjs)
- [LangChain Discord Community](https://discord.gg/langchain)

## License

This project is intended for learning purposes.

---

This project was created using `bun init` in bun v1.2.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
