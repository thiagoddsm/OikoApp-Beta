import { NextRequest, NextResponse } from 'next/server';
import { saveShapeStepProgress, submitShapeAssessment } from '@/app/public/molde-de-servo/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.isFinalSubmission) {
      const result = await submitShapeAssessment(body);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    const result = await saveShapeStepProgress(body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    console.error('[API /api/shape/progress] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erro interno ao processar salvamento.',
      },
      { status: 500 }
    );
  }
}
