// Brings @testing-library/jest-dom matcher types (toBeInTheDocument,
// toHaveAttribute, …) into the package's TS program so component tests type
// against them. Runtime registration happens in tests/setup.jsdom.ts.
import '@testing-library/jest-dom/vitest'
