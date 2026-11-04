using Application.DTOs.Flow5;

namespace Application.Interfaces.Flow5;

public interface IFlow5IncidentService
{
    // ==========================================
    // BASE INCIDENT LIFECYCLE (J02 - J06)
    // ==========================================
    Task<IncidentResponseDto> ReportIncidentAsync(ReportIncidentInputDto dto, string reporterUserId);
    Task<List<IncidentResponseDto>> GetIncidentsAsync(string? tripId, string? status);
    Task<IncidentResponseDto> GetIncidentByIdAsync(string incidentId);
    Task<IncidentResponseDto> AcceptIncidentAsync(string incidentId, string coordinatorUserId);

    // ==========================================
    // J01: CAPABILITIES & J07-J09: IMPACT / UPDATES
    // ==========================================
    Task<CapabilitiesDto> GetCapabilitiesAsync();
    Task<ImpactAssessmentResultDto> SaveImpactAssessmentAsync(string incidentId, AssessmentInputDto dto, string userId);
    Task<IncidentUpdateDto> AddUpdateAsync(string incidentId, UpdateInputDto dto, string userId);
    Task<List<IncidentUpdateDto>> GetUpdatesAsync(string incidentId);

    // ==========================================
    // J10-J12: TASKS
    // ==========================================
    Task<IncidentTaskDto> CreateTaskAsync(string incidentId, TaskInputDto dto, string coordinatorUserId);
    Task<List<IncidentTaskDto>> GetTasksAsync(string incidentId);
    Task<IncidentTaskDto> UpdateTaskProgressAsync(string incidentId, string taskId, TaskProgressInputDto dto, string userId);

    // ==========================================
    // J13-J20, J43: RECOVERY PLAN LIFECYCLE
    // ==========================================
    Task<RecoveryContextDto> GetRecoveryContextAsync(string incidentId);
    Task<RecoveryPlanDto> SaveRecoveryDraftAsync(string incidentId, RecoveryInputDto dto, string userId);
    Task<RecoveryValidateResultDto> ValidateRecoveryPlanAsync(string incidentId, RecoveryInputDto dto);
    Task<RecoveryPlanDto> SubmitRecoveryPlanAsync(string incidentId, RecoveryInputDto dto, string userId);
    Task<RecoveryPlanDto> DecideRecoveryPlanAsync(string incidentId, RecoveryDecisionInputDto dto, string managerUserId);
    Task<RecoveryPlanDto> RequestRecoveryRevisionAsync(string incidentId, RecoveryRevisionInputDto dto, string coordinatorUserId);
    Task<RecoveryPlanDto> WithdrawRecoveryPlanAsync(string incidentId, string coordinatorUserId);
    Task<IncidentHistoryDto> GetHistoryAsync(string incidentId);
    Task<ResourceOptionDto> GetResourceOptionsAsync(string incidentId);

    // ==========================================
    // J21-J23: SPECIALIST, VET & EXTERNAL ACTIONS
    // ==========================================
    Task<ComplianceReviewDto> SaveComplianceReviewAsync(string incidentId, ComplianceInputDto dto, string specialistUserId);
    Task<VetAssessmentDto> SaveVetAssessmentAsync(string incidentId, VetInputDto dto, string vetUserId);
    Task<ExternalActionDto> LogExternalActionAsync(string incidentId, ExternalActionInputDto dto, string coordinatorUserId);

    // ==========================================
    // J24-J28: APPLY, CONTINUATION & CLOSURE
    // ==========================================
    Task<RecoveryApplyDto> ApplyRecoveryPlanAsync(string incidentId, string coordinatorUserId);
    Task<ContinuationReadinessDto> GetContinuationReadinessAsync(string incidentId);
    Task<IncidentResponseDto> ContinueTripAsync(string incidentId, ContinuationInputDto dto, string coordinatorUserId);
    Task<IncidentResponseDto> ResolveIncidentAsync(string incidentId, IncidentResolutionInputDto dto, string coordinatorUserId);
    Task<IncidentResponseDto> ReopenIncidentAsync(string incidentId, IncidentReopenInputDto dto, string coordinatorUserId);

    // ==========================================
    // J29-J33: CUSTOMER COMMUNICATIONS
    // ==========================================
    Task<List<CustomerIncidentSummaryDto>> GetCustomerIncidentsAsync(string requestId);
    Task<CustomerIncidentDetailDto> GetCustomerIncidentDetailAsync(string requestId, string incidentId);
    Task<IncidentCommunicationDto> CreateCustomerCommunicationAsync(string incidentId, CommunicationInputDto dto, string managerUserId);
    Task<IncidentCommunicationDto> ReplyCustomerCommunicationAsync(string requestId, string incidentId, string messageId, CustomerReplyDto dto, string customerUserId);
    Task<IncidentCommunicationDto> LogExternalAgreementAsync(string incidentId, ExternalAgreementInputDto dto, string managerUserId);

    // ==========================================
    // J34-J36, J42: FILES & EVIDENCE
    // ==========================================
    Task<IncidentFileDto> UploadIncidentFileAsync(string? tripId, string? incidentId, IncidentFileUploadInputDto dto, string userId);
    Task<IncidentFileDto> GetIncidentFileAsync(string incidentId, string fileId, bool isCustomerView = false);
    Task<IncidentFileDto> ShareFileWithCustomerAsync(string incidentId, string fileId, ShareFileInputDto dto, string managerUserId);

    // ==========================================
    // J37-J41: TERMINATION PROPOSALS
    // ==========================================
    Task<TerminationProposalDto> CreateTerminationProposalAsync(string incidentId, TerminationInputDto dto, string managerUserId);
    Task<TerminationProposalDto> ReplyTerminationProposalAsync(string requestId, string incidentId, string proposalId, TerminationReplyInputDto dto, string customerUserId);
    Task<TerminationProposalDto> ReferTerminationProposalAsync(string incidentId, string proposalId, TerminationReferInputDto dto, string managerUserId);
    Task<List<TerminationProposalDto>> GetTerminationProposalsAsync(string incidentId);
    Task<List<TerminationProposalDto>> GetCustomerTerminationProposalsAsync(string requestId, string incidentId);
}
