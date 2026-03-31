export enum MailSurface {
  Dashboard = "dashboard",
  OutlookAddIn = "outlook-addin"
}

export enum MessageActionability {
  Actionable = "actionable",
  Informational = "informational"
}

export enum FilingState {
  PendingClassification = "pending_classification",
  ActiveActionable = "active_actionable",
  ActiveInformationalUnread = "active_informational_unread",
  EligibleToFile = "eligible_to_file",
  Filed = "filed"
}

export enum TaskStatus {
  Open = "open",
  Snoozed = "snoozed",
  Delegated = "delegated",
  Done = "done",
  Dismissed = "dismissed"
}

export enum WorkflowStatus {
  Healthy = "healthy"
}
