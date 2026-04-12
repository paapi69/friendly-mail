import { describe, expect, it } from "vitest";

import { buildBrowserPreviewContext } from "./host";
import { buildWorkflowPreviewState } from "./sample-data";
import { deriveWorkflowPanelViewModel } from "./workflow";

describe("deriveWorkflowPanelViewModel", () => {
  it("shows a low-confidence state when classification signals are cautious", () => {
    const context = buildBrowserPreviewContext("low-confidence");
    const preview = buildWorkflowPreviewState(context);

    const viewModel = deriveWorkflowPanelViewModel({
      context,
      readinessStatus: "ready",
      classification: preview.classification,
      workflow: preview.workflow,
      classificationError: preview.classificationError,
      workflowError: preview.workflowError,
      isLoading: false
    });

    expect(viewModel.status).toBe("low-confidence");
    expect(viewModel.confidenceLabel).toContain("Low confidence");
  });

  it("surfaces task actions and filing impact for linked workflow tasks", () => {
    const context = buildBrowserPreviewContext("ready");
    const preview = buildWorkflowPreviewState(context);

    const viewModel = deriveWorkflowPanelViewModel({
      context,
      readinessStatus: "ready",
      classification: preview.classification,
      workflow: preview.workflow,
      classificationError: preview.classificationError,
      workflowError: preview.workflowError,
      isLoading: false
    });

    expect(viewModel.taskRows[0]?.availableActions.map((action) => action.kind)).toEqual([
      "done",
      "snooze",
      "delegate",
      "dismiss"
    ]);
    expect(viewModel.taskRows[0]?.effectSummary).toContain("blocking filing");
  });

  it("shows incomplete data when only one workflow read model is available", () => {
    const context = buildBrowserPreviewContext("ready");
    const preview = buildWorkflowPreviewState(context);

    const viewModel = deriveWorkflowPanelViewModel({
      context,
      readinessStatus: "ready",
      classification: preview.classification,
      workflow: null,
      classificationError: null,
      workflowError: "not-found",
      isLoading: false
    });

    expect(viewModel.status).toBe("incomplete-data");
    expect(viewModel.note).toContain("placeholders");
  });

  it("shows a failed-read state when both workflow reads fail", () => {
    const context = buildBrowserPreviewContext("ready");

    const viewModel = deriveWorkflowPanelViewModel({
      context,
      readinessStatus: "ready",
      classification: null,
      workflow: null,
      classificationError: "network",
      workflowError: "network",
      isLoading: false
    });

    expect(viewModel.status).toBe("failed-read");
    expect(viewModel.note).toContain("network");
  });

  it("waits for readiness before presenting workflow detail", () => {
    const context = buildBrowserPreviewContext("syncing");

    const viewModel = deriveWorkflowPanelViewModel({
      context,
      readinessStatus: "syncing",
      classification: null,
      workflow: null,
      classificationError: null,
      workflowError: null,
      isLoading: false
    });

    expect(viewModel.status).toBe("waiting-readiness");
  });
});
