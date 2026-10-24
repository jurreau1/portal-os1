import { getPipeline } from "../api/pipeline";
import { PipelineBoard } from "../components/PipelineBoard";
import { AsyncState } from "../components/AsyncState";
import { useApi } from "../hooks/useApi";
export default function Pipeline() {
  const state = useApi(getPipeline);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FORWARD MOMENTUM</div>
          <h1>
            Pipeline<span className="title-dot">.</span>
          </h1>
          <p>Follow each product from its first idea to live release.</p>
        </div>
      </div>
      <AsyncState {...state} retry={state.reload} />
      {state.data && <PipelineBoard columns={state.data} />}
    </>
  );
}
