import { useState } from 'react';
import { submitReport } from '../services/feedback';
import { getVersion } from '../lib/version';

/**
 * Report-issue modal state and handlers.
 * @param {{ currentUser: { id?: string, email?: string } | null, screen: string, gameCode: string }} ctx
 */
export function useReportModal({ currentUser, screen, gameCode }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('bug');
  const [reportEmail, setReportEmail] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const openReportModal = () => {
    setReportCategory('bug');
    setReportEmail(currentUser?.email || '');
    setReportSubject('');
    setReportDetails('');
    setReportError(null);
    setReportSuccess(false);
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    if (reportSubmitting) return;
    setShowReportModal(false);
    setReportError(null);
    setReportSuccess(false);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (reportSubmitting) return;
    setReportError(null);
    setReportSubmitting(true);
    try {
      await submitReport({
        category: reportCategory,
        email: reportEmail,
        subject: reportSubject,
        details: reportDetails,
        appVersion: getVersion(),
        screen,
        gameCode: gameCode || null,
        userId: currentUser?.id || null,
      });
      setReportSuccess(true);
    } catch (error) {
      setReportError(error.message || 'Could not submit your report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  return {
    showReportModal,
    reportCategory,
    setReportCategory,
    reportEmail,
    setReportEmail,
    reportSubject,
    setReportSubject,
    reportDetails,
    setReportDetails,
    reportSubmitting,
    reportError,
    reportSuccess,
    openReportModal,
    closeReportModal,
    handleSubmitReport,
  };
}
