"""8. Existing workflow access and safety capabilities, without inventing its protocol."""
from ..models import Fault


class AgentManager:
    REQUIRED = {'business_key_upsert', 'idempotent_operations', 'authoritative_read', 'conditional_write'}

    def connect(self, registry, config):
        source, workflow = registry.resolve(config)
        if not self.REQUIRED.issubset(getattr(workflow, 'capabilities', set())):
            raise Fault('WORKFLOW_UNSAFE', '工作流缺少唯一键、幂等、条件更新或结果核验能力，已停止执行。', 409)
        if config['notifications']['enabled'] and 'idempotent_notifications' not in workflow.capabilities:
            raise Fault('NOTIFICATION_UNSAFE', '工作流尚未提供通知幂等能力。', 409)
        workflow.check_access(config)
        return source, workflow
