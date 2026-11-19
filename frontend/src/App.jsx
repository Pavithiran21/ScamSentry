import { Route, Routes } from 'react-router';
import { GuestOnly, RequireRole, RequireSignedIn } from './auth/RouteGuards';
import { AccountPage } from './features/account/AccountPage';
import { DemoPage } from './features/auth/DemoPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { LoginPage } from './features/auth/LoginPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { SignupPage } from './features/auth/SignupPage';
import { CheckPage } from './features/check/CheckPage';
import { HistoryPage } from './features/history/HistoryPage';
import { SavedCheckPage } from './features/history/SavedCheckPage';
import { MyReportsPage } from './features/myReports/MyReportsPage';
import { ReviewPage } from './features/review/ReviewPage';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Every route (UI-UX.md "Routes and navigation"). The guards only decide what is shown; the
 * server checks the login, the role and the ownership on every request.
 */
export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Guest and User; a Moderator is sent to /review */}
        <Route index element={<CheckPage />} />

        {/* Signed out only */}
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="demo" element={<DemoPage />} />
        </Route>

        {/* Anyone, so a reset link works in any browser */}
        <Route path="reset-password" element={<ResetPasswordPage />} />

        <Route element={<RequireSignedIn />}>
          <Route path="account" element={<AccountPage />} />
          <Route element={<RequireRole role="user" />}>
            <Route path="history" element={<HistoryPage />} />
            <Route path="history/:id" element={<SavedCheckPage />} />
            <Route path="reports" element={<MyReportsPage />} />
            <Route path="reports/:id" element={<MyReportsPage />} />
          </Route>
          <Route element={<RequireRole role="moderator" />}>
            <Route path="review" element={<ReviewPage />} />
            <Route path="review/:id" element={<ReviewPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
