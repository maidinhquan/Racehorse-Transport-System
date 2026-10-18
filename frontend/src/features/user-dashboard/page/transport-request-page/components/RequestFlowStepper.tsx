import React from "react";
import "./RequestFlowStepper.css";

interface RequestFlowStepperProps {
  currentStep: 1 | 2 | 3;
}

export const RequestFlowStepper: React.FC<RequestFlowStepperProps> = ({ currentStep }) => {
  const steps = [
    {
      num: 1,
      title: "Hợp đồng thông tin",
      subtitle: "Xác nhận & Ký hợp đồng",
    },
    {
      num: 2,
      title: "Thanh toán đặt cọc",
      subtitle: "Đặt cọc 30% giá trị",
    },
    {
      num: 3,
      title: "Điền thông tin & Giấy tờ",
      subtitle: "Hồ sơ kiểm dịch & vận chuyển",
    },
  ];

  return (
    <div className="flow-stepper-wrapper">
      <div className="flow-stepper-container">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.num;
          const isActive = currentStep === step.num;

          return (
            <React.Fragment key={step.num}>
              {index > 0 && (
                <div
                  className={`flow-stepper-connector ${
                    currentStep >= step.num ? "completed" : ""
                  }`}
                >
                  <div className="connector-line" />
                </div>
              )}

              <div
                className={`flow-stepper-item ${
                  isCompleted ? "completed" : ""
                } ${isActive ? "active" : ""}`}
              >
                <div className="flow-stepper-circle">
                  {isCompleted ? "✓" : step.num}
                </div>

                <div className="flow-stepper-text">
                  <span className="flow-stepper-title">{step.title}</span>
                  <span className="flow-stepper-subtitle">{step.subtitle}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default RequestFlowStepper;
