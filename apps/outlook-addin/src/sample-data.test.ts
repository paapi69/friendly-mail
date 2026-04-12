import { describe, expect, it } from "vitest";
import { FilingDecisionStatus, FilingState, TaskStatus } from "@friendly-mail/contracts";

import { buildBrowserPreviewContext } from "./host";
import {
  applyPreviewTaskTransition,
  buildPreviewFilingDecisionReadModel,
  buildWorkflowPreviewState,
  executePreviewFilingDecision
} from "./sample-data";

describe("preview task transitions", () => {
  it("updates filing eligibility when a preview task is marked done", () => {
    const context = buildBrowserPreviewContext("ready");
    const preview = buildWorkflowPreviewState(context);
    const workflow = preview.workflow;

    expect(workflow).not.toBeNull();

    const nextWorkflow = applyPreviewTaskTransition({
      workflow: workflow!,
      taskId: "task_preview_123",
      transition: {
        status: TaskStatus.Done
      }
    });

    expect(nextWorkflow.tasks[0]?.task.status).toBe(TaskStatus.Done);
    expect(nextWorkflow.filingEligibility.isEligible).toBe(true);
    expect(nextWorkflow.workflowState.blockedBy).toEqual([]);
  });

  it("derives and executes a preview filing decision once workflow blockers clear", () => {
    const context = buildBrowserPreviewContext("ready");
    const preview = buildWorkflowPreviewState(context);
    const workflow = applyPreviewTaskTransition({
      workflow: preview.workflow!,
      taskId: "task_preview_123",
      transition: {
        status: TaskStatus.Done
      }
    });

    const decision = buildPreviewFilingDecisionReadModel({
      classification: preview.classification,
      workflow
    });

    expect(decision?.decision.status).toBe(FilingDecisionStatus.Eligible);

    const filedWorkflow = executePreviewFilingDecision({
      workflow
    });

    expect(filedWorkflow.workflowState.filingState).toBe(FilingState.Filed);
    expect(filedWorkflow.filingEligibility.state).toBe(FilingState.Filed);
  });
});
