import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AccountsScreen } from './screens/AccountsScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { AssetDetailScreen } from './screens/AssetDetailScreen';
import { CardOperationDetailScreen } from './screens/CardOperationDetailScreen';
import { CardsScreen } from './screens/CardsScreen';
import { ExchangeScreen } from './screens/ExchangeScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InstallGuideScreen } from './screens/InstallGuideScreen';
import { ReceiveScreen } from './screens/ReceiveScreen';
import { SendScreen } from './screens/SendScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PwaInstallProvider } from './state/PwaInstallContext';
import { SettingsProvider } from './state/SettingsContext';
import { WalletProvider } from './state/WalletContext';

const CryptoIconGallery = import.meta.env.DEV
  ? lazy(() =>
      import('./components/CryptoIcon/CryptoIconGallery').then((module) => ({
        default: module.CryptoIconGallery,
      })),
    )
  : null;

export default function App() {
  return (
    <SettingsProvider>
      <PwaInstallProvider>
        <WalletProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<HomeScreen />} />
                <Route path="activity" element={<ActivityScreen />} />
                <Route path="cards" element={<CardsScreen />} />
                <Route path="cards/op/:operationId" element={<CardOperationDetailScreen />} />
                <Route path="exchange" element={<ExchangeScreen />} />
                <Route path="settings" element={<SettingsScreen />} />
                <Route path="install" element={<InstallGuideScreen />} />
                <Route path="accounts" element={<AccountsScreen />} />
                <Route path="asset/:assetId" element={<AssetDetailScreen />} />
                <Route path="send" element={<SendScreen />} />
                <Route path="receive" element={<ReceiveScreen />} />
                {CryptoIconGallery ? (
                  <Route
                    path="dev/crypto-icons"
                    element={
                      <Suspense fallback={null}>
                        <CryptoIconGallery />
                      </Suspense>
                    }
                  />
                ) : null}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WalletProvider>
      </PwaInstallProvider>
    </SettingsProvider>
  );
}
