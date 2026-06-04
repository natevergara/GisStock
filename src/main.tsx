import { render } from 'preact';
import { App } from './app';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const root = document.getElementById('app');
if (root) render(<ErrorBoundary><App /></ErrorBoundary>, root);
