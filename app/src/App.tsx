import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AccountsScreen } from './screens/AccountsScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { AssetDetailScreen } from './screens/AssetDetailScreen';
import { ExchangeScreen } from './screens/ExchangeScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ReceiveScreen } from './screens/ReceiveScreen';
import { SendScreen } from './screens/SendScreen';
import { WalletProvider } from './state/WalletContext';

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomeScreen />} />
            <Route path="activity" element={<ActivityScreen />} />
            <Route path="exchange" element={<ExchangeScreen />} />
            <Route path="accounts" element={<AccountsScreen />} />
            <Route path="asset/:assetId" element={<AssetDetailScreen />} />
            <Route path="send" element={<SendScreen />} />
            <Route path="receive" element={<ReceiveScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
