export type Chapter2StepType = 'story' | 'battle' | 'reward' | 'title' | 'credits';

export interface Chapter2FlowStep {
  type: Chapter2StepType;
  id?: string;        // story の場合はファイル名の一部、battle の場合は敵設定の参照など
  subStage?: number;  // 既存ロジックとの互換性用
  count?: number;     // reward の場合の選択数
  skill?: string;      // 特定のスキル獲得用
  choices?: string[];  // 選択肢からスキル獲得用
  note?: string;      // 開発者用メモ
}

export interface Chapter2StageFlow {
  stageNo: number;
  flow: Chapter2FlowStep[];
}
