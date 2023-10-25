import _ from 'underscore';
import lodashGet from 'lodash/get';
import React, {useMemo} from 'react';
import {View} from 'react-native';
import Str from 'expensify-common/lib/str';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import {parsePhoneNumber} from 'awesome-phonenumber';
import HeaderWithBackButton from '../../components/HeaderWithBackButton';
import StatePicker from '../../components/StatePicker';
import CONST from '../../CONST';
import * as BankAccounts from '../../libs/actions/BankAccounts';
import Text from '../../components/Text';
import DatePicker from '../../components/DatePicker';
import TextInput from '../../components/TextInput';
import styles from '../../styles/styles';
import CheckboxWithLabel from '../../components/CheckboxWithLabel';
import TextLink from '../../components/TextLink';
import withLocalize from '../../components/withLocalize';
import * as ValidationUtils from '../../libs/ValidationUtils';
import compose from '../../libs/compose';
import ONYXKEYS from '../../ONYXKEYS';
import Picker from '../../components/Picker';
import AddressForm from './AddressForm';
import Form from '../../components/Form';
import ScreenWrapper from '../../components/ScreenWrapper';
import StepPropTypes from './StepPropTypes';

const propTypes = {
    ...StepPropTypes,

    /** Session info for the currently logged in user. */
    session: PropTypes.shape({
        /** Currently logged in user email */
        email: PropTypes.string,
    }),

    /** Object with various information about the user */
    user: PropTypes.shape({
        /** Whether or not the user is on a public domain email account or not */
        isFromPublicDomain: PropTypes.bool,
    }),

    /* The workspace policyID */
    policyID: PropTypes.string,
};

const defaultProps = {
    session: {
        email: null,
    },
    user: {},
    policyID: '',
};

function CompanyStep({reimbursementAccount, reimbursementAccountDraft, getDefaultStateForField, onBackButtonPress, translate, session, user, policyID}) {
    /**
     * @param {Array} fieldNames
     *
     * @returns {*}
     */
    const getBankAccountFields = (fieldNames) => ({
        ..._.pick(lodashGet(reimbursementAccount, 'achData'), ...fieldNames),
        ..._.pick(reimbursementAccountDraft, ...fieldNames),
    });

    const defaultWebsite = useMemo(() => (lodashGet(user, 'isFromPublicDomain', false) ? 'https://' : `https://www.${Str.extractEmailDomain(session.email, '')}`), [user, session]);

    /**
     * @param {Object} values - form input values passed by the Form component
     * @returns {Object} - Object containing the errors for each inputID, e.g. {inputID1: error1, inputID2: error2}
     */
    const validate = (values) => {
        const requiredFields = [
            'companyName',
            'addressStreet',
            'addressZipCode',
            'addressCity',
            'addressState',
            'companyPhone',
            'website',
            'companyTaxID',
            'incorporationType',
            'incorporationDate',
            'incorporationState',
        ];
        const errors = ValidationUtils.getFieldRequiredErrors(values, requiredFields);

        if (values.addressStreet && !ValidationUtils.isValidAddress(values.addressStreet)) {
            errors.addressStreet = 'bankAccount.error.addressStreet';
        }

        if (values.addressZipCode && !ValidationUtils.isValidZipCode(values.addressZipCode)) {
            errors.addressZipCode = 'bankAccount.error.zipCode';
        }

        if (values.companyPhone && !ValidationUtils.isValidUSPhone(values.companyPhone, true)) {
            errors.companyPhone = 'bankAccount.error.phoneNumber';
        }

        if (values.website && !ValidationUtils.isValidWebsite(values.website)) {
            errors.website = 'bankAccount.error.website';
        }

        if (values.companyTaxID && !ValidationUtils.isValidTaxID(values.companyTaxID)) {
            errors.companyTaxID = 'bankAccount.error.taxID';
        }

        if (values.incorporationDate && !ValidationUtils.isValidDate(values.incorporationDate)) {
            errors.incorporationDate = 'common.error.dateInvalid';
        } else if (values.incorporationDate && !ValidationUtils.isValidPastDate(values.incorporationDate)) {
            errors.incorporationDate = 'bankAccount.error.incorporationDateFuture';
        }

        if (!values.hasNoConnectionToCannabis) {
            errors.hasNoConnectionToCannabis = 'bankAccount.error.restrictedBusiness';
        }

        return errors;
    };

    const submit = (values) => {
        const bankAccount = {
            bankAccountID: lodashGet(reimbursementAccount, 'achData.bankAccountID') || 0,

            // Fields from BankAccount step
            ...getBankAccountFields(['routingNumber', 'accountNumber', 'bankName', 'plaidAccountID', 'plaidAccessToken', 'isSavings']),

            // Fields from Company step
            ...values,
            companyTaxID: values.companyTaxID.replace(CONST.REGEX.NON_NUMERIC, ''),
            companyPhone: parsePhoneNumber(values.companyPhone, {regionCode: CONST.COUNTRY.US}).number.significant,
        };

        BankAccounts.updateCompanyInformationForBankAccount(bankAccount, policyID);
    };

    const bankAccountID = lodashGet(reimbursementAccount, 'achData.bankAccountID', 0);
    const shouldDisableCompanyName = Boolean(bankAccountID && getDefaultStateForField('companyName'));
    const shouldDisableCompanyTaxID = Boolean(bankAccountID && getDefaultStateForField('companyTaxID'));

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            testID={CompanyStep.displayName}
        >
            <HeaderWithBackButton
                title={translate('companyStep.headerTitle')}
                stepCounter={{step: 2, total: 5}}
                shouldShowGetAssistanceButton
                guidesCallTaskID={CONST.GUIDES_CALL_TASK_IDS.WORKSPACE_BANK_ACCOUNT}
                onBackButtonPress={onBackButtonPress}
            />
            <Form
                formID={ONYXKEYS.REIMBURSEMENT_ACCOUNT}
                validate={validate}
                onSubmit={submit}
                scrollContextEnabled
                submitButtonText={translate('common.saveAndContinue')}
                style={[styles.mh5, styles.flexGrow1]}
            >
                <Text>{translate('companyStep.subtitle')}</Text>
                <TextInput
                    label={translate('companyStep.legalBusinessName')}
                    accessibilityLabel={translate('companyStep.legalBusinessName')}
                    accessibilityRole={CONST.ACCESSIBILITY_ROLE.TEXT}
                    inputID="companyName"
                    containerStyles={[styles.mt4]}
                    disabled={shouldDisableCompanyName}
                    defaultValue={getDefaultStateForField('companyName')}
                    shouldSaveDraft
                    shouldUseDefaultValue={shouldDisableCompanyName}
                />
                <AddressForm
                    translate={translate}
                    defaultValues={{
                        street: getDefaultStateForField('addressStreet'),
                        city: getDefaultStateForField('addressCity'),
                        state: getDefaultStateForField('addressState'),
                        zipCode: getDefaultStateForField('addressZipCode'),
                    }}
                    inputKeys={{
                        street: 'addressStreet',
                        city: 'addressCity',
                        state: 'addressState',
                        zipCode: 'addressZipCode',
                    }}
                    shouldSaveDraft
                    streetTranslationKey="common.companyAddress"
                />
                <TextInput
                    inputID="companyPhone"
                    label={translate('common.phoneNumber')}
                    accessibilityLabel={translate('common.phoneNumber')}
                    accessibilityRole={CONST.ACCESSIBILITY_ROLE.TEXT}
                    containerStyles={[styles.mt4]}
                    keyboardType={CONST.KEYBOARD_TYPE.PHONE_PAD}
                    placeholder={translate('common.phoneNumberPlaceholder')}
                    defaultValue={getDefaultStateForField('companyPhone')}
                    shouldSaveDraft
                />
                <TextInput
                    inputID="website"
                    label={translate('companyStep.companyWebsite')}
                    accessibilityLabel={translate('companyStep.companyWebsite')}
                    accessibilityRole={CONST.ACCESSIBILITY_ROLE.TEXT}
                    containerStyles={[styles.mt4]}
                    defaultValue={getDefaultStateForField('website', defaultWebsite)}
                    shouldSaveDraft
                    hint="common.websiteExample"
                    keyboardType={CONST.KEYBOARD_TYPE.URL}
                />
                <TextInput
                    inputID="companyTaxID"
                    label={translate('companyStep.taxIDNumber')}
                    accessibilityLabel={translate('companyStep.taxIDNumber')}
                    accessibilityRole={CONST.ACCESSIBILITY_ROLE.TEXT}
                    containerStyles={[styles.mt4]}
                    keyboardType={CONST.KEYBOARD_TYPE.NUMBER_PAD}
                    disabled={shouldDisableCompanyTaxID}
                    placeholder={translate('companyStep.taxIDNumberPlaceholder')}
                    defaultValue={getDefaultStateForField('companyTaxID')}
                    shouldSaveDraft
                    shouldUseDefaultValue={shouldDisableCompanyTaxID}
                />
                <View style={styles.mt4}>
                    <Picker
                        inputID="incorporationType"
                        label={translate('companyStep.companyType')}
                        items={_.map(_.keys(CONST.INCORPORATION_TYPES), (key) => ({value: key, label: translate(`companyStep.incorporationTypes.${key}`)}))}
                        placeholder={{value: '', label: '-'}}
                        defaultValue={getDefaultStateForField('incorporationType')}
                        shouldSaveDraft
                    />
                </View>
                <View style={styles.mt4}>
                    <DatePicker
                        inputID="incorporationDate"
                        label={translate('companyStep.incorporationDate')}
                        placeholder={translate('companyStep.incorporationDatePlaceholder')}
                        defaultValue={getDefaultStateForField('incorporationDate')}
                        shouldSaveDraft
                    />
                </View>
                <View style={[styles.mt4, styles.mhn5]}>
                    <StatePicker
                        inputID="incorporationState"
                        label={translate('companyStep.incorporationState')}
                        defaultValue={getDefaultStateForField('incorporationState')}
                        shouldSaveDraft
                    />
                </View>
                <CheckboxWithLabel
                    accessibilityLabel={`${translate('companyStep.confirmCompanyIsNot')} ${translate('companyStep.listOfRestrictedBusinesses')}`}
                    inputID="hasNoConnectionToCannabis"
                    defaultValue={getDefaultStateForField('hasNoConnectionToCannabis', false)}
                    LabelComponent={() => (
                        <Text>
                            {`${translate('companyStep.confirmCompanyIsNot')} `}
                            <TextLink
                                // eslint-disable-next-line max-len
                                href="https://community.expensify.com/discussion/6191/list-of-restricted-businesses"
                            >
                                {`${translate('companyStep.listOfRestrictedBusinesses')}.`}
                            </TextLink>
                        </Text>
                    )}
                    style={[styles.mt4]}
                    shouldSaveDraft
                />
            </Form>
        </ScreenWrapper>
    );
}

CompanyStep.propTypes = propTypes;
CompanyStep.defaultProps = defaultProps;
CompanyStep.displayName = 'CompanyStep';

export default compose(
    withLocalize,
    withOnyx({
        session: {
            key: ONYXKEYS.SESSION,
        },
        user: {
            key: ONYXKEYS.USER,
        },
    }),
)(CompanyStep);
