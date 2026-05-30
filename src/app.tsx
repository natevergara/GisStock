import { useStockStore } from './store/useStockStore';
import { UploadScreen } from './components/UploadScreen';
import { EditorScreen } from './components/EditorScreen';

export function App() {
  const loaded = useStockStore((s) => s.loaded);

  if (!loaded) return <UploadScreen />;
  return <EditorScreen />;
}
