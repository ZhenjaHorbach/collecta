// ValidationResultSheet has a 3-way title-key branch (status not ok →
// uncertainTitle; ok+valid → validTitle; ok+invalid → invalidTitle) and a
// 2-way save button label (saveAnyway when valid===false). Pin both —
// the wrong copy makes the user think the photo was rejected.

import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@components/ProgressBar', () => ({
  ProgressBar: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

// eslint-disable-next-line import/first
import { ValidationResultSheet } from '../ValidationResultSheet/ValidationResultSheet';

const VALID_RESULT = {
  valid: true,
  confidence: 0.92,
  detected: 'A wooden door',
  suggestion: 'Looks good',
};

describe('ValidationResultSheet — title branches', () => {
  it('renders uncertainTitle when status is not ok', () => {
    render(
      <ValidationResultSheet
        status="vision_failed"
        result={null}
        onSave={() => {}}
        onRetake={() => {}}
      />
    );
    expect(screen.getByText('validation.uncertainTitle')).toBeTruthy();
  });

  it('renders validTitle when status is ok and result.valid', () => {
    render(
      <ValidationResultSheet
        status="ok"
        result={VALID_RESULT}
        onSave={() => {}}
        onRetake={() => {}}
      />
    );
    expect(screen.getByText('validation.validTitle')).toBeTruthy();
  });

  it('renders invalidTitle when status is ok and result.valid is false', () => {
    render(
      <ValidationResultSheet
        status="ok"
        result={{ ...VALID_RESULT, valid: false }}
        onSave={() => {}}
        onRetake={() => {}}
      />
    );
    expect(screen.getByText('validation.invalidTitle')).toBeTruthy();
  });
});

describe('ValidationResultSheet — save button label', () => {
  it('reads "save anyway" when the AI says the photo is invalid', () => {
    render(
      <ValidationResultSheet
        status="ok"
        result={{ ...VALID_RESULT, valid: false }}
        onSave={() => {}}
        onRetake={() => {}}
      />
    );
    expect(screen.getByText('validation.saveAnyway')).toBeTruthy();
    expect(screen.queryByText('camera.save')).toBeNull();
  });

  it('reads the standard "save" label when the AI says valid', () => {
    render(
      <ValidationResultSheet
        status="ok"
        result={VALID_RESULT}
        onSave={() => {}}
        onRetake={() => {}}
      />
    );
    expect(screen.getByText('camera.save')).toBeTruthy();
  });
});

describe('ValidationResultSheet — confidence percent rounding', () => {
  it('rounds confidence to whole percent', () => {
    render(
      <ValidationResultSheet
        status="ok"
        result={{ ...VALID_RESULT, confidence: 0.926 }}
        onSave={() => {}}
        onRetake={() => {}}
      />
    );
    expect(screen.getByText(/validation\.confidence.*"percent":93/)).toBeTruthy();
  });
});

describe('ValidationResultSheet — interactions', () => {
  it('forwards onSave / onRetake', () => {
    const onSave = jest.fn();
    const onRetake = jest.fn();
    render(
      <ValidationResultSheet
        status="ok"
        result={VALID_RESULT}
        onSave={onSave}
        onRetake={onRetake}
      />
    );
    fireEvent.press(screen.getByText('camera.retake'));
    fireEvent.press(screen.getByText('camera.save'));
    expect(onRetake).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
