import styled from "@emotion/styled";
import theme from "../style/theme";

export default function ExamSummaryModal({
  open,
  onClose,
  onConfirm,
  examName,
  examNum,
  hasSelective,
  selectiveCount,
  selectiveRange,
  answerScores,
  answerTypesArray,
  answers,
  selectiveScores,
  selectiveAnswerTypesArray,
  selectiveSubjects,
}) {
  if (!open) return null;

  // 공통 과목 배점/유형/답
  const commonScores = answerScores?.split(",").map((v) => v.trim());
  const commonTypes = answerTypesArray;
  const commonAnswers = answers?.split(",").map((v) => v.trim());

  // 선택 과목 배점/유형
  const selectiveScoresArr = selectiveScores?.split(",").map((v) => v.trim());
  const selectiveTypesArr = selectiveAnswerTypesArray;

  return (
    <Overlay>
      <Modal>
        <Title>시험 등록 최종 확인</Title>
        <Section>
          <b>시험명:</b> {examName}
        </Section>
        <Section>
          <b>문제 수:</b> {examNum}문제
        </Section>
        <Section>
          <b>선택 과목:</b>{" "}
          {hasSelective
            ? `있음 (${selectiveCount}개, 범위: ${selectiveRange})`
            : "없음"}
        </Section>
        <Section>
          <b>공통 과목 답:</b> {commonAnswers?.join(", ")}
        </Section>
        <Section>
          <b>공통 과목 배점:</b> {commonScores?.join(", ")}
        </Section>
        <Section>
          <b>공통 과목 문제 유형:</b> {commonTypes?.join(", ")}
        </Section>
        {hasSelective && (
          <>
            <Section>
              <b>선택 과목 배점:</b> {selectiveScoresArr?.join(", ")}
            </Section>
            <Section>
              <b>선택 과목 문제 유형:</b> {selectiveTypesArr?.join(", ")}
            </Section>
            <Section>
              <b>선택 과목별 답:</b>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {selectiveSubjects?.map((subject, idx) => (
                  <li key={idx}>
                    {subject.name}: {subject.answers || "(미입력)"}
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
        <ButtonRow>
          <CancelButton onClick={onClose}>취소</CancelButton>
          <ConfirmButton onClick={onConfirm}>최종 등록</ConfirmButton>
        </ButtonRow>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;
const Modal = styled.div`
  background: #fff;
  border-radius: 1rem;
  padding: 2rem;
  min-width: 350px;
  max-width: 90vw;
`;
const Title = styled.h2`
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
`;
const Section = styled.div`
  margin-bottom: 0.7rem;
  font-size: 1rem;
`;
const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
`;
const CancelButton = styled.button`
  background: #eee;
  color: #333;
  border: none;
  border-radius: 0.5rem;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
`;
const ConfirmButton = styled.button`
  background: ${() => theme.primary[500]};
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
`;
